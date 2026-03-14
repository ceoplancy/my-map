import type { NextApiRequest, NextApiResponse } from "next"
import { createSupabaseWithToken } from "@/lib/supabase/supabaseServer"
import { sendResourceRequestNotificationStub } from "@/lib/emailStub"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const auth = req.headers.authorization
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const client = createSupabaseWithToken(token)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }
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
}
