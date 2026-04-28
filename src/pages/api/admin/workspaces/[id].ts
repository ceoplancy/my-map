import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { getAuthUserFromApiRequest, isServiceAdmin } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"
import { insertPlatformAuditLog } from "@/lib/server/platformAuditLog"
import type { AccountType } from "@/types/db"

export default withApiHandler(async (req, res) => {
  if (req.method !== "DELETE" && req.method !== "PATCH") {
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

  if (req.method === "PATCH") {
    const body = req.body as { name?: string; account_type?: AccountType }
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const accountType =
      body.account_type === "listed_company" ||
      body.account_type === "proxy_company"
        ? body.account_type
        : null
    if (!name || !accountType) {
      return res.status(400).json({
        error:
          "name and account_type(listed_company|proxy_company) are required",
      })
    }
    const { data: updated, error: updateErr } = await admin
      .from("workspaces")
      .update({ name, account_type: accountType })
      .eq("id", workspaceId)
      .select("id, name, account_type, created_at")
      .maybeSingle()
    if (updateErr) {
      return res.status(500).json({ error: updateErr.message })
    }
    if (!updated) {
      return res.status(404).json({ error: "Workspace not found" })
    }
    await insertPlatformAuditLog(admin, {
      actor_user_id: auth.user.id,
      action: "workspace.update",
      resource_type: "workspace",
      resource_id: workspaceId,
      details: {
        before_name: ws.name,
        after_name: updated.name,
        after_account_type: updated.account_type,
      },
    })

    return res.status(200).json(updated)
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
