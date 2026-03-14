import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { getBearerToken, getAuthUser } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

export default withApiHandler(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const token = getBearerToken(req)
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  const auth = await getAuthUser(token)
  if (!auth) return res.status(401).json({ error: "Unauthorized" })

  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from("signup_requests")
    .select("id, status, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)

  return res.status(200).json(data?.[0] ?? null)
})
