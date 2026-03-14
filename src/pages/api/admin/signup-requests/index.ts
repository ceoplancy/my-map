import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"
import { getBearerToken, isServiceAdmin } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

/** 워크스페이스 관리자(top_admin/admin) 여부 및 해당 워크스페이스명 반환 */
async function getWorkspaceNameIfAdmin(
  accessToken: string,
  workspaceId: string,
): Promise<string | null> {
  const client = createSupabaseWithToken(accessToken)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return null
  const admin = createSupabaseAdmin()
  const { data: member } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .in("role", ["top_admin", "admin", "service_admin"])
    .limit(1)
    .single()
  if (!member?.workspace_id) return null
  const { data: workspace } = await admin
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single()

  return workspace?.name ?? null
}

export default withApiHandler(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const token = getBearerToken(req)
  if (!token) return res.status(401).json({ error: "Unauthorized" })

  const workspaceId =
    typeof req.query.workspace_id === "string" ? req.query.workspace_id : null

  const admin = createSupabaseAdmin()

  if (workspaceId) {
    const workspaceName = await getWorkspaceNameIfAdmin(token, workspaceId)
    if (!workspaceName) {
      return res
        .status(403)
        .json({ error: "해당 워크스페이스 관리 권한이 없습니다." })
    }
    const { data, error } = await admin
      .from("signup_requests")
      .select("*")
      .eq("workspace_name", workspaceName)
      .order("created_at", { ascending: false })
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json(data ?? [])
  }

  if (!(await isServiceAdmin(token))) {
    return res
      .status(401)
      .json({ error: "서비스 관리자만 전체 목록을 조회할 수 있습니다." })
  }
  const { data, error } = await admin
    .from("signup_requests")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json(data ?? [])
})
