import { useEffect } from "react"
import { useRouter } from "next/router"
import AdminLayout from "@/layouts/AdminLayout"
import { ExcelImportPageContent } from "@/pages/admin/excel-import"
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

/** listId 없이 접근 시 주주명부 목록으로 리다이렉트. listId 있으면 파일 가져오기 본문 표시 */
export default function WorkspaceAdminExcelImportPage() {
  const router = useRouter()
  const { listId } = router.query as { listId?: string }
  const { resolvedWorkspace, isReady } = useWorkspaceAdminRoute()
  const hasListId = typeof listId === "string" && listId.length > 0

  useEffect(() => {
    if (!isReady || !resolvedWorkspace || hasListId) return
    const base = getWorkspaceAdminBase(resolvedWorkspace.id)
    router.replace(`${base}/lists`)
  }, [isReady, resolvedWorkspace, hasListId, router])

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

  if (!hasListId) {
    return (
      <AdminLayout>
        <SpinnerFrame>
          <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
        </SpinnerFrame>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <ExcelImportPageContent />
    </AdminLayout>
  )
}
