import { useLayoutEffect } from "react"
import { useRouter } from "next/router"
import { useAdminStatus, useAuth, useMyWorkspaces } from "@/api/auth"
import { useWorkspaceMembers } from "@/api/workspace"
import { useCurrentWorkspace } from "@/store/workspaceState"
import type { MyWorkspaceItem } from "@/types/db"

/**
 * 워크스페이스 관리 하위 페이지에서 workspaceId로 워크스페이스를 해석하고
 * 현재 워크스페이스 스토어에 동기화합니다.
 * - top_admin / admin: workspace_members 에 해당 workspace_id 행으로 판별
 * - service_admin: 멤버 행은 workspace_id IS NULL 뿐이라 members 조회에 없음 → isServiceAdmin 으로 판별
 * - field_agent: 관리자 패널 접근 불가 → 지도로 리다이렉트
 */
export function useWorkspaceAdminRoute() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId?: string }
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()
  const { user } = useAuth()
  const { data: adminStatus, isLoading: adminStatusLoading } = useAdminStatus()
  const isServiceAdmin = adminStatus?.isServiceAdmin ?? false
  const userId = user?.id ?? null
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
    isServiceAdmin ||
    (myMember !== null && ["top_admin", "admin"].includes(myMember.role))

  useLayoutEffect(() => {
    if (!resolvedWorkspace) return
    setCurrentWorkspace(resolvedWorkspace)
  }, [resolvedWorkspace, setCurrentWorkspace])

  /**
   * 관리 패널 접근 불가 시 지도로 보냄.
   * - field_agent: myMember 있음 + canAccessAdmin false
   * - 멤버 조회에 본인 행이 없음(세션 타이밍·RLS 등): myMember null + canAccessAdmin false →
   *   이전에는 리다이렉트가 없어 isReady 가 영원히 false(스피너 무한)였음
   * - service_admin: canAccessAdmin true 이므로 리다이렉트 안 함
   */
  useLayoutEffect(() => {
    if (
      !router.isReady ||
      !workspaceId ||
      workspacesLoading ||
      membersLoading ||
      adminStatusLoading ||
      !resolvedWorkspace
    )
      return
    if (!canAccessAdmin) {
      router.replace(`/workspaces/${workspaceId}`)
    }
  }, [
    router,
    workspaceId,
    workspacesLoading,
    membersLoading,
    adminStatusLoading,
    resolvedWorkspace,
    canAccessAdmin,
  ])

  /** 멤버 행이 없을 때는 service_admin 여부를 알기 위해 admin-status 로딩을 기다림 */
  const isReady =
    router.isReady &&
    Boolean(workspaceId) &&
    !workspacesLoading &&
    !membersLoading &&
    (myMember !== null ? canAccessAdmin : !adminStatusLoading && canAccessAdmin)

  return {
    workspaceId,
    resolvedWorkspace,
    isReady,
    workspacesLoading,
    canAccessAdmin,
  }
}
