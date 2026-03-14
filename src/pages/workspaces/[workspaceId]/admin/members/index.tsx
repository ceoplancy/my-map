import { useEffect } from "react"
import { useRouter } from "next/router"

/** /workspaces/[id]/admin/members → /workspaces/[id]/admin/users 로 리다이렉트 (멤버·사용자 관리 통합) */
export default function WorkspaceAdminMembersRedirect() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId: string }

  useEffect(() => {
    if (workspaceId && typeof window !== "undefined")
      router.replace(`/workspaces/${workspaceId}/admin/users`)
  }, [workspaceId, router])

  return null
}
