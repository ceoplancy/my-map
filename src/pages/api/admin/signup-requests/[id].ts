import type { NextApiRequest, NextApiResponse } from "next"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"

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
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const auth = req.headers.authorization
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token || !(await isServiceAdmin(token))) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const id = req.query.id as string
  const body = req.body as { action: "approve" | "reject" }
  if (!id || !body?.action) {
    return res.status(400).json({ error: "id and action required" })
  }
  const admin = createSupabaseAdmin()
  const client = createSupabaseWithToken(token)
  const {
    data: { user: currentUser },
  } = await client.auth.getUser()
  if (!currentUser) return res.status(401).json({ error: "Unauthorized" })

  const { data: request, error: fetchErr } = await admin
    .from("signup_requests")
    .select("*")
    .eq("id", id)
    .single()
  if (fetchErr || !request) {
    return res.status(404).json({ error: "Request not found" })
  }
  if (request.status !== "pending") {
    return res.status(400).json({ error: "Request already processed" })
  }

  if (body.action === "reject") {
    const { error: upErr } = await admin
      .from("signup_requests")
      .update({
        status: "rejected",
        processed_by: currentUser.id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (upErr) return res.status(500).json({ error: upErr.message })

    return res.status(200).json({ success: true })
  }

  if (body.action === "approve" && request.user_id) {
    const { data: workspace, error: wsErr } = await admin
      .from("workspaces")
      .insert({
        name: request.workspace_name,
        account_type: request.account_type,
      })
      .select("id")
      .single()
    if (wsErr || !workspace) {
      return res
        .status(500)
        .json({ error: wsErr?.message ?? "Failed to create workspace" })
    }
    const { error: memberErr } = await admin.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: request.user_id,
      role: "top_admin",
    })
    if (memberErr) {
      return res.status(500).json({ error: memberErr.message })
    }
    const { error: upErr } = await admin
      .from("signup_requests")
      .update({
        status: "approved",
        processed_by: currentUser.id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (upErr) return res.status(500).json({ error: upErr.message })

    return res.status(200).json({ success: true })
  }

  return res.status(400).json({ error: "Invalid action or missing user_id" })
}
