import type { NextApiRequest, NextApiResponse } from "next"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
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
  if (!user) return res.status(401).json({ error: "Unauthorized" })
  const admin = createSupabaseAdmin()
  const { data: members } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .not("workspace_id", "is", null)
  const workspaceIds = [
    ...new Set(
      (members ?? [])
        .map((m) => m.workspace_id)
        .filter((id): id is string => id != null),
    ),
  ]
  if (workspaceIds.length === 0) {
    return res.status(200).json([])
  }
  const { data: workspaces } = await admin
    .from("workspaces")
    .select("id, name, account_type")
    .in("id", workspaceIds)

  return res.status(200).json(workspaces ?? [])
}
