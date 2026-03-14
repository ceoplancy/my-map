import { createSupabaseWithToken } from "@/lib/supabase/supabaseServer"
import { getBearerToken, getAuthUser } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"
import { sendResourceRequestNotificationStub } from "@/lib/emailStub"

export default withApiHandler(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const auth = await getAuthUser(token)
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const { user, token: accessToken } = auth
  const client = createSupabaseWithToken(accessToken)

  const workspaceId =
    typeof req.body?.workspace_id === "string" ? req.body.workspace_id : null

  const { data, error } = await client
    .from("resource_requests")
    .insert({
      workspace_id: workspaceId,
      requested_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  sendResourceRequestNotificationStub({
    workspaceId,
    requestedBy: user.id,
  })

  return res.status(200).json(data)
})
