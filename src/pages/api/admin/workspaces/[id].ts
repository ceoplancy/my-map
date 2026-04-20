import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { getAuthUserFromApiRequest, isServiceAdmin } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"
import { insertPlatformAuditLog } from "@/lib/server/platformAuditLog"

export default withApiHandler(async (req, res) => {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const auth = await getAuthUserFromApiRequest(req, res)
  if (!auth || !(await isServiceAdmin(auth.token))) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const workspaceId = typeof req.query.id === "string" ? req.query.id : ""
  if (!workspaceId) {
    return res.status(400).json({ error: "id required" })
  }

  const admin = createSupabaseAdmin()
  const { data: ws, error: fetchErr } = await admin
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .maybeSingle()
  if (fetchErr) {
    return res.status(500).json({ error: fetchErr.message })
  }
  if (!ws) {
    return res.status(404).json({ error: "Workspace not found" })
  }

  const { error: delErr } = await admin
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
  if (delErr) {
    return res.status(500).json({ error: delErr.message })
  }

  await insertPlatformAuditLog(admin, {
    actor_user_id: auth.user.id,
    action: "workspace.delete",
    resource_type: "workspace",
    resource_id: workspaceId,
    details: { name: ws.name },
  })

  return res.status(200).json({ success: true })
})
