import type { NextApiRequest, NextApiResponse } from "next"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"

export type WorkspaceMemberWithUser = {
  id: string
  user_id: string
  workspace_id: string | null
  role: string
  created_at: string
  email: string | null
  name: string | null
  allowed_list_ids: string[] | null
  is_team_leader: boolean | null
}

/** GET: workspace members with email/name from Auth. Requester must be a member of the workspace. */
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

  const workspaceId = req.query.workspaceId
  if (typeof workspaceId !== "string" || !workspaceId) {
    return res.status(400).json({ error: "workspaceId required" })
  }

  const admin = createSupabaseAdmin()

  const { data: members, error: membersError } = await admin
    .from("workspace_members")
    .select(
      "id, user_id, workspace_id, role, created_at, allowed_list_ids, is_team_leader",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (membersError) {
    return res.status(500).json({ error: membersError.message })
  }

  const requesterMember = (members ?? []).find((m) => m.user_id === user.id)
  const isServiceAdmin =
    (
      await admin
        .from("workspace_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "service_admin")
        .is("workspace_id", null)
        .maybeSingle()
    ).data != null

  if (!requesterMember && !isServiceAdmin) {
    return res.status(403).json({ error: "Not a member of this workspace" })
  }

  const withUsers: WorkspaceMemberWithUser[] = []
  for (const m of members ?? []) {
    const {
      data: { user: authUser },
    } = await admin.auth.admin.getUserById(m.user_id)
    const email =
      authUser?.email ?? (authUser?.user_metadata?.email as string) ?? null
    const name =
      (authUser?.user_metadata?.name as string) ??
      (authUser?.user_metadata?.full_name as string) ??
      null
    withUsers.push({
      id: m.id,
      user_id: m.user_id,
      workspace_id: m.workspace_id,
      role: m.role,
      created_at: m.created_at,
      email: email ?? null,
      name: name ?? null,
      allowed_list_ids: m.allowed_list_ids ?? null,
      is_team_leader: m.is_team_leader ?? null,
    })
  }

  return res.status(200).json(withUsers)
}
