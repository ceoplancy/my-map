import type { NextApiRequest, NextApiResponse } from "next"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"
import type { AccountType } from "@/types/db"

/** 통합 관리자(service_admin)만 워크스페이스 관리 API 사용 가능 */
async function isServiceAdmin(accessToken: string): Promise<boolean> {
  const client = createSupabaseWithToken(accessToken)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return false
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from("workspace_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "service_admin")
    .is("workspace_id", null)
    .limit(1)

  return (data?.length ?? 0) > 0
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = req.headers.authorization
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token || !(await isServiceAdmin(token))) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const client = createSupabaseWithToken(token)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const admin = createSupabaseAdmin()

  if (req.method === "GET") {
    const { data: workspaces } = await admin
      .from("workspaces")
      .select("id, name, account_type, created_at")
      .order("created_at", { ascending: false })

    return res.status(200).json(workspaces ?? [])
  }

  if (req.method === "POST") {
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
}
