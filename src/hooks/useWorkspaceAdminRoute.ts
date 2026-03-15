import { useLayoutEffect } from "react"
import { useRouter } from "next/router"
import { useMyWorkspaces, useSession } from "@/api/auth"
import { useWorkspaceMembers } from "@/api/workspace"
import { useCurrentWorkspace } from "@/store/workspaceState"
import type { MyWorkspaceItem } from "@/types/db"

/** 용역(field_agent) 역할은 관리자 패널 접근 불가 */
const ADMIN_ALLOWED_ROLES = ["service_admin", "top_admin", "admin"]

/**
 * 워크스페이스 관리 하위 페이지에서 workspaceId로 워크스페이스를 해석하고
 * 현재 워크스페이스 스토어에 동기화합니다.
 * 용역(field_agent) 역할이면 관리자 패널 접근 시 지도로 리다이렉트합니다.
 */
export function useWorkspaceAdminRoute() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId?: string }
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()
  const { data: session } = useSession()
  const userId = session?.user?.id ?? null
  const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers(
    typeof workspaceId === "string" ? workspaceId : null,
  )
  const [, setCurrentWorkspace] = useCurrentWorkspace()

  const resolvedWorkspace: MyWorkspaceItem | null =
    workspaceId && Array.isArray(workspaces)
      ? (workspaces.find((w) => w.id === workspaceId) ?? null)
      : null

  const myMember =
    resolvedWorkspace && userId
      ? (members.find((m) => m.user_id === userId) ?? null)
      : null
  const canAccessAdmin =
    myMember !== null && ADMIN_ALLOWED_ROLES.includes(myMember.role)

  useLayoutEffect(() => {
    if (!resolvedWorkspace) return
    setCurrentWorkspace(resolvedWorkspace)
  }, [resolvedWorkspace, setCurrentWorkspace])

  useLayoutEffect(() => {
    if (
      !router.isReady ||
      !workspaceId ||
      workspacesLoading ||
      membersLoading ||
      !resolvedWorkspace
    )
      return
    if (myMember !== null && !canAccessAdmin) {
      router.replace(`/workspaces/${workspaceId}`)
    }
  }, [
    router,
    workspaceId,
    workspacesLoading,
    membersLoading,
    resolvedWorkspace,
    myMember,
    canAccessAdmin,
  ])

  const isReady =
    router.isReady &&
    Boolean(workspaceId) &&
    !workspacesLoading &&
    !membersLoading &&
    canAccessAdmin

  return {
    workspaceId,
    resolvedWorkspace,
    isReady,
    workspacesLoading,
    canAccessAdmin: myMember === null || canAccessAdmin,
  }
}
