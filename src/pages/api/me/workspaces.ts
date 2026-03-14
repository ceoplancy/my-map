import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { getBearerToken, getAuthUser } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

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
  const admin = createSupabaseAdmin()

  // 통합 관리자(service_admin): workspace_id가 NULL인 멤버십이 있으면 전체 워크스페이스 목록 반환
  const { data: serviceAdminRow } = await admin
    .from("workspace_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "service_admin")
    .is("workspace_id", null)
    .maybeSingle()

  if (serviceAdminRow) {
    const { data: allWorkspaces } = await admin
      .from("workspaces")
      .select("id, name, account_type")
      .order("created_at", { ascending: false })

    return res.status(200).json(allWorkspaces ?? [])
  }

  // 개별 워크스페이스 관리자: 자신이 멤버인 워크스페이스만
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
    console.warn(
      "[api/me/workspaces] No workspace memberships for user",
      user.id,
      user.email,
    )

    return res.status(200).json([])
  }
  const { data: workspaces } = await admin
    .from("workspaces")
    .select("id, name, account_type")
    .in("id", workspaceIds)

  return res.status(200).json(workspaces ?? [])
})
