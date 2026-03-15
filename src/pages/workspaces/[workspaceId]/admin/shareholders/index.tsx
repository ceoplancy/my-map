import { useEffect } from "react"
import { useRouter } from "next/router"
import AdminLayout from "@/layouts/AdminLayout"
import GlobalSpinner from "@/components/ui/global-spinner"
import { getWorkspaceAdminBase } from "@/lib/utils"
import { useWorkspaceAdminRoute } from "@/hooks/useWorkspaceAdminRoute"
import styled from "@emotion/styled"

const SpinnerFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
`

/** 주주명부 목록·관리 통합 페이지(lists)로 리다이렉트 */
export default function WorkspaceAdminShareholdersPage() {
  const router = useRouter()
  const { listId } = router.query as {
    workspaceId: string
    listId?: string
  }
  const { resolvedWorkspace, isReady } = useWorkspaceAdminRoute()

  useEffect(() => {
    if (!isReady || !resolvedWorkspace) return
    const base = getWorkspaceAdminBase(resolvedWorkspace.id)
    const query = typeof listId === "string" ? { listId } : {}
    router.replace({ pathname: `${base}/lists`, query })
  }, [isReady, resolvedWorkspace, listId, router])

  if (!isReady) {
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

  return (
    <AdminLayout>
      <SpinnerFrame>
        <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
      </SpinnerFrame>
    </AdminLayout>
  )
}
