import AdminLayout from "@/layouts/AdminLayout"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useEffect } from "react"
import { useRouter } from "next/router"
import { useCurrentWorkspace } from "@/store/workspaceState"

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
`

const EmptyMessage = styled.div`
  padding: 3rem;
  text-align: center;
  background: ${COLORS.gray[50]};
  border-radius: 1rem;
  color: ${COLORS.gray[600]};
  font-size: 0.9375rem;
`

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${COLORS.text.primary};
`

/**
 * 레거시 경로 /admin/shareholders.
 * 워크스페이스가 있으면 주주명부 통합 페이지(lists)로 리다이렉트.
 */
export default function ShareholdersPage() {
  const router = useRouter()
  const [currentWorkspace] = useCurrentWorkspace()

  useEffect(() => {
    if (!currentWorkspace || typeof window === "undefined") return
    router.replace(`/workspaces/${currentWorkspace.id}/admin/lists`)
  }, [currentWorkspace, router])

  if (currentWorkspace) return null

  return (
    <AdminLayout>
      <Container>
        <PageTitle>주주명부 관리</PageTitle>
        <EmptyMessage>워크스페이스를 선택해 주세요.</EmptyMessage>
      </Container>
    </AdminLayout>
  )
}
