import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { getAuthUserFromApiRequest } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

export default withApiHandler(async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store, must-revalidate")

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const auth = await getAuthUserFromApiRequest(req, res)
  if (!auth) return res.status(401).json({ error: "Unauthorized" })
  const { user } = auth
  const admin = createSupabaseAdmin()

  // 모든 사용자(최고 관리자 포함): 자신이 멤버인 워크스페이스만 반환. 통합 관리는 /admin/integrated에서 별도 처리.
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
