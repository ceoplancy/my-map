import { useLayoutEffect } from "react"
import { useRouter } from "next/router"
import AdminLayout from "@/layouts/AdminLayout"
import { useGetUserData, useMyWorkspaces } from "@/api/auth"
import { useCurrentWorkspace } from "@/store/workspaceState"
import { WorkspaceDashboardBody } from "@/pages/admin"
import GlobalSpinner from "@/components/ui/global-spinner"
import styled from "@emotion/styled"

const SpinnerFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
`

/** 워크스페이스별 관리자 대시보드: /workspaces/[workspaceId]/admin */
export default function WorkspaceAdminDashboardPage() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId: string }
  const { data: user } = useGetUserData()
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()
  const [, setCurrentWorkspace] = useCurrentWorkspace()

  const resolvedWorkspace =
    workspaceId && Array.isArray(workspaces)
      ? (workspaces.find((w) => w.id === workspaceId) ?? null)
      : null

  useLayoutEffect(() => {
    if (!resolvedWorkspace) return
    setCurrentWorkspace(resolvedWorkspace)
  }, [resolvedWorkspace, setCurrentWorkspace])

  if (!router.isReady || !workspaceId) {
    return (
      <AdminLayout>
        <SpinnerFrame>
          <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
        </SpinnerFrame>
      </AdminLayout>
    )
  }

  if (workspacesLoading) {
    return (
      <AdminLayout>
        <SpinnerFrame>
          <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
        </SpinnerFrame>
      </AdminLayout>
    )
  }

  if (!resolvedWorkspace) {
    if (typeof window !== "undefined") router.replace("/workspaces")

    return null
  }

  if (!user?.user) return null

  return (
    <AdminLayout>
      <WorkspaceDashboardBody />
    </AdminLayout>
  )
}
