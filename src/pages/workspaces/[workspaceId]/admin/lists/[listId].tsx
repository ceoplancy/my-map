import { useRouter } from "next/router"
import AdminLayout from "@/layouts/AdminLayout"
import { useGetUserData } from "@/api/auth"
import { useWorkspaceAdminRoute } from "@/hooks/useWorkspaceAdminRoute"
import { useShareholderLists } from "@/api/workspace"
import { getWorkspaceAdminBase } from "@/lib/utils"
import ShareholderList from "@/components/admin/shareholders/ShareholderList"
import GlobalSpinner from "@/components/ui/global-spinner"
import Link from "next/link"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"

const SpinnerFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
`

const Breadcrumb = styled.nav`
  font-size: 0.875rem;
  color: ${COLORS.gray[600]};
  margin-bottom: 1rem;

  a {
    color: ${COLORS.blue[600]};
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  span {
    color: ${COLORS.gray[900]};
    font-weight: 500;
  }
`

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
`

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${COLORS.text.primary};
`

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
`

const LinkButton = styled(Link)`
  padding: 0.375rem 0.75rem;
  background: ${COLORS.gray[100]};
  color: ${COLORS.gray[700]};
  border-radius: 6px;
  font-size: 0.8125rem;
  text-decoration: none;
  &:hover {
    background: ${COLORS.gray[200]};
  }
`

/** 해당 명부의 주주 관리 전용 페이지 (명부명 클릭 또는 주주 보기 시 이동) */
export default function WorkspaceAdminListShareholdersPage() {
  const router = useRouter()
  const listId =
    typeof router.query.listId === "string" ? router.query.listId : ""
  const { resolvedWorkspace, isReady } = useWorkspaceAdminRoute()
  const { data: user } = useGetUserData()
  const workspaceId = resolvedWorkspace?.id ?? null
  const { data: listsData } = useShareholderLists(workspaceId)
  const lists = listsData ?? []

  const list =
    listId !== "" ? (lists.find((l) => l.id === listId) ?? null) : null
  const base =
    resolvedWorkspace !== undefined && resolvedWorkspace !== null
      ? getWorkspaceAdminBase(resolvedWorkspace.id)
      : ""

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

  if (!user?.user) return null

  if (!listId || !list) {
    if (typeof window !== "undefined" && base) router.replace(`${base}/lists`)

    return null
  }

  return (
    <AdminLayout>
      <Breadcrumb>
        <Link href={`${base}/lists`}>주주명부 목록</Link>
        {" / "}
        <span>{list.name}</span>
      </Breadcrumb>
      <PageHeader>
        <PageTitle>주주 관리</PageTitle>
        <HeaderActions>
          <LinkButton
            href={{
              pathname: `${base}/change-history`,
              query: { listId },
            }}>
            변경 이력
          </LinkButton>
          <LinkButton href={`${base}/excel-import?listId=${listId}`}>
            엑셀 업로드
          </LinkButton>
        </HeaderActions>
      </PageHeader>
      <ShareholderList listId={listId} />
    </AdminLayout>
  )
}
