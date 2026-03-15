import { useLayoutEffect } from "react"
import { useRouter } from "next/router"
import { useMyWorkspaces } from "@/api/auth"
import { useCurrentWorkspace } from "@/store/workspaceState"
import type { MyWorkspaceItem } from "@/types/db"

/**
 * 워크스페이스 관리 하위 페이지에서 workspaceId로 워크스페이스를 해석하고
 * 현재 워크스페이스 스토어에 동기화합니다.
 */
export function useWorkspaceAdminRoute() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId?: string }
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()
  const [, setCurrentWorkspace] = useCurrentWorkspace()

  const resolvedWorkspace: MyWorkspaceItem | null =
    workspaceId && Array.isArray(workspaces)
      ? (workspaces.find((w) => w.id === workspaceId) ?? null)
      : null

  useLayoutEffect(() => {
    if (!resolvedWorkspace) return
    setCurrentWorkspace(resolvedWorkspace)
  }, [resolvedWorkspace, setCurrentWorkspace])

  const isReady = router.isReady && Boolean(workspaceId) && !workspacesLoading

  return {
    workspaceId,
    resolvedWorkspace,
    isReady,
    workspacesLoading,
  }
}
