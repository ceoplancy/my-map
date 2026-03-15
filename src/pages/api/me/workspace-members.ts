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

const WORKSPACE_ROLES = [
  "service_admin",
  "top_admin",
  "admin",
  "field_agent",
] as const

/** GET: workspace members. POST: add member by email (workspace admin only). */
export default withApiHandler(async (req, res) => {
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const auth = await getAuthUser(token)
  if (!auth) return res.status(401).json({ error: "Unauthorized" })
  const { user } = auth

  const workspaceId =
    typeof req.query.workspaceId === "string"
      ? req.query.workspaceId
      : (req.body as { workspaceId?: string })?.workspaceId
  if (!workspaceId) {
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
  const isServiceAdminUser = await isServiceAdmin(token)
  const isWorkspaceAdmin =
    requesterMember &&
    ["service_admin", "top_admin", "admin"].includes(requesterMember.role)

  if (!requesterMember && !isServiceAdminUser) {
    return res.status(403).json({ error: "Not a member of this workspace" })
  }

  if (req.method === "POST") {
    if (!isWorkspaceAdmin && !isServiceAdminUser) {
      return res
        .status(403)
        .json({ error: "워크스페이스 관리자만 멤버를 추가할 수 있습니다." })
    }
    const body = req.body as {
      email?: string
      role?: string
      name?: string
      password?: string
      allowed_list_ids?: string[] | null
    }
    const email = typeof body?.email === "string" ? body.email.trim() : ""
    const role = body?.role
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const password = typeof body?.password === "string" ? body.password : ""
    const allowedListIds = Array.isArray(body?.allowed_list_ids)
      ? body.allowed_list_ids
      : null

    if (!email) {
      return res.status(400).json({ error: "email required" })
    }
    if (
      !role ||
      !WORKSPACE_ROLES.includes(role as (typeof WORKSPACE_ROLES)[number])
    ) {
      return res.status(400).json({
        error:
          "role must be one of: service_admin, top_admin, admin, field_agent",
      })
    }

    let page = 0
    const perPage = 1000
    let foundUserId: string | null = null
    while (true) {
      const { data: listData } = await admin.auth.admin.listUsers({
        page,
        perPage,
      })
      const users = listData?.users ?? []
      const match = users.find(
        (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
      )
      if (match) {
        foundUserId = match.id
        break
      }
      if (users.length < perPage) break
      page++
    }

    if (!foundUserId) {
      if (!password || password.length < 6) {
        return res.status(400).json({
          error:
            "해당 이메일로 가입된 사용자가 없습니다. 새로 만들려면 비밀번호(6자 이상)를 입력하세요.",
        })
      }
      const { data: newUser, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: name ? { name } : undefined,
        })
      if (createErr) {
        return res.status(400).json({
          error: createErr.message || "사용자 생성에 실패했습니다.",
        })
      }
      foundUserId = newUser?.user?.id ?? null
      if (!foundUserId) {
        return res
          .status(500)
          .json({ error: "사용자 생성 후 ID를 확인할 수 없습니다." })
      }
    }

    const existing = (members ?? []).find((m) => m.user_id === foundUserId)
    if (existing) {
      return res
        .status(400)
        .json({ error: "이미 해당 워크스페이스 멤버입니다." })
    }

    const insertPayload: {
      workspace_id: string
      user_id: string
      role: (typeof WORKSPACE_ROLES)[number]
      allowed_list_ids?: string[] | null
    } = {
      workspace_id: workspaceId,
      user_id: foundUserId,
      role: role as (typeof WORKSPACE_ROLES)[number],
    }
    if (allowedListIds !== undefined) {
      insertPayload.allowed_list_ids = allowedListIds
    }

    const { error: insertErr } = await admin
      .from("workspace_members")
      .insert(insertPayload)
    if (insertErr) {
      return res.status(500).json({ error: insertErr.message })
    }

    return res.status(201).json({ success: true })
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
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
