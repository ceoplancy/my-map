import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { getBearerToken, getAuthUser, isServiceAdmin } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

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
export default withApiHandler(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const auth = await getAuthUser(token)
  if (!auth) return res.status(401).json({ error: "Unauthorized" })
  const { user } = auth

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
  const isAdmin = await isServiceAdmin(token)

  if (!requesterMember && !isAdmin) {
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
})
