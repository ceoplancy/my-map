import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import type { AccountType } from "@/types/db"
import {
  getAuthUserFromApiRequest,
  isPlatformAdminMetadata,
  isServiceAdmin,
} from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

export default withApiHandler(async (req, res) => {
  const auth = await getAuthUserFromApiRequest(req, res)
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const { user } = auth

  const admin = createSupabaseAdmin()

  if (req.method === "GET") {
    if (!(await isServiceAdmin(auth.token))) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    const { data: workspaces } = await admin
      .from("workspaces")
      .select("id, name, account_type, created_at")
      .order("created_at", { ascending: false })

    return res.status(200).json(workspaces ?? [])
  }

  if (req.method === "POST") {
    const canCreate =
      (await isServiceAdmin(auth.token)) || isPlatformAdminMetadata(user)
    if (!canCreate) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    const body = req.body as { name?: string; account_type?: AccountType }
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const account_type = body?.account_type
    if (!name) {
      return res.status(400).json({ error: "name is required" })
    }
    const accountType: AccountType | undefined =
      account_type === "listed_company" || account_type === "proxy_company"
        ? account_type
        : undefined
    if (!accountType) {
      return res.status(400).json({
        error: "account_type must be listed_company or proxy_company",
      })
    }
    const { data: workspace, error: wsErr } = await admin
      .from("workspaces")
      .insert({ name, account_type: accountType })
      .select("id, name, account_type, created_at")
      .single()
    if (wsErr || !workspace) {
      return res
        .status(500)
        .json({ error: wsErr?.message ?? "Failed to create workspace" })
    }
    const { error: memberErr } = await admin.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "top_admin",
    })
    if (memberErr) {
      return res.status(500).json({
        error: memberErr.message ?? "Failed to add creator as member",
      })
    }

    return res.status(201).json(workspace)
  }

  return res.status(405).json({ error: "Method not allowed" })
})
