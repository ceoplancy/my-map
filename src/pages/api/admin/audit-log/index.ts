import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { getAuthUserFromApiRequest, isServiceAdmin } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

export default withApiHandler(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const auth = await getAuthUserFromApiRequest(req, res)
  if (!auth || !(await isServiceAdmin(auth.token))) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const limitRaw = Number(req.query.limit)
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 500
      ? Math.floor(limitRaw)
      : 200

  const admin = createSupabaseAdmin()
  const { data, error } = await admin
    .from("platform_audit_log")
    .select(
      "id, created_at, actor_user_id, action, resource_type, resource_id, details",
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json(data ?? [])
})
