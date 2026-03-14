import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"
import { getBearerToken, isServiceAdmin } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

/** 해당 워크스페이스명에 대한 가입 승인/반려 권한 여부 */
async function canManageSignupForWorkspaceName(
  accessToken: string,
  workspaceName: string,
): Promise<boolean> {
  const client = createSupabaseWithToken(accessToken)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return false
  const admin = createSupabaseAdmin()
  const { data: workspaces } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .in("role", ["top_admin", "admin", "service_admin"])
  const ids = (workspaces ?? [])
    .map((w) => w.workspace_id)
    .filter(Boolean) as string[]
  if (ids.length === 0) return false
  const { data: names } = await admin
    .from("workspaces")
    .select("name")
    .in("id", ids)

  return (names ?? []).some((n) => n.name === workspaceName)
}

export default withApiHandler(async (req, res) => {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const token = getBearerToken(req)
  if (!token) return res.status(401).json({ error: "Unauthorized" })
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

  const isServiceAdminUser = await isServiceAdmin(token)
  const canManageWorkspace = await canManageSignupForWorkspaceName(
    token,
    request.workspace_name,
  )
  if (!isServiceAdminUser && !canManageWorkspace) {
    return res
      .status(403)
      .json({ error: "해당 가입 신청을 처리할 권한이 없습니다." })
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
})
