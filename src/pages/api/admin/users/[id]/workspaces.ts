import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { getAuthUserFromApiRequest, isServiceAdmin } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

const ASSIGNABLE_ROLES = ["top_admin", "admin", "field_agent"] as const

export type UserWorkspaceMembership = {
  workspaceId: string
  workspaceName: string
  role: string
  memberId: string
}

/** GET: 사용자의 워크스페이스 멤버십 목록 (서비스 관리자 전용) */
export default withApiHandler(async (req, res) => {
  const auth = await getAuthUserFromApiRequest(req, res)
  if (!auth || !(await isServiceAdmin(auth.token))) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const userId = req.query.id as string
  if (!userId) return res.status(400).json({ error: "id required" })

  const admin = createSupabaseAdmin()

  if (req.method === "GET") {
    const { data: members, error: membersError } = await admin
      .from("workspace_members")
      .select("id, workspace_id, role")
      .eq("user_id", userId)
      .not("workspace_id", "is", null)

    if (membersError) {
      return res.status(500).json({ error: membersError.message })
    }

    if (!members?.length) {
      return res.status(200).json([])
    }

    const workspaceIds = [
      ...new Set(
        (members ?? [])
          .map((m) => m.workspace_id)
          .filter((id): id is string => id != null),
      ),
    ]
    const { data: workspaces, error: wsError } = await admin
      .from("workspaces")
      .select("id, name")
      .in("id", workspaceIds)

    if (wsError) {
      return res.status(500).json({ error: wsError.message })
    }

    const nameById = new Map((workspaces ?? []).map((w) => [w.id, w.name]))
    const list: UserWorkspaceMembership[] = (members ?? []).map((m) => ({
      workspaceId: m.workspace_id ?? "",
      workspaceName: nameById.get(m.workspace_id ?? "") ?? "",
      role: m.role,
      memberId: m.id,
    }))

    return res.status(200).json(list)
  }

  if (req.method === "POST") {
    const body = req.body as { workspaceId?: string; role?: string }
    const workspaceId =
      typeof body?.workspaceId === "string" ? body.workspaceId.trim() : ""
    const role = body?.role

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId required" })
    }
    if (
      !role ||
      !ASSIGNABLE_ROLES.includes(role as (typeof ASSIGNABLE_ROLES)[number])
    ) {
      return res.status(400).json({
        error: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`,
      })
    }

    const existing = await admin
      .from("workspace_members")
      .select("id, role")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle()

    if (existing.data) {
      const { error: updateErr } = await admin
        .from("workspace_members")
        .update({ role: role as (typeof ASSIGNABLE_ROLES)[number] })
        .eq("id", existing.data.id)
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message })
      }

      return res.status(200).json({ success: true })
    }

    const { error: insertErr } = await admin.from("workspace_members").insert({
      user_id: userId,
      workspace_id: workspaceId,
      role: role as (typeof ASSIGNABLE_ROLES)[number],
    })
    if (insertErr) {
      return res.status(500).json({ error: insertErr.message })
    }

    return res.status(201).json({ success: true })
  }

  if (req.method === "DELETE") {
    const workspaceId =
      typeof req.query.workspaceId === "string"
        ? req.query.workspaceId.trim()
        : ""
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId required" })
    }

    const { error: deleteErr } = await admin
      .from("workspace_members")
      .delete()
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)

    if (deleteErr) {
      return res.status(500).json({ error: deleteErr.message })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: "Method not allowed" })
})
