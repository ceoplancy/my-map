import AdminLayout from "@/layouts/AdminLayout"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import ShareholderList from "@/components/admin/shareholders/ShareholderList"
import { useRouter } from "next/router"
import Link from "next/link"

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, white, #f8fafc);
  padding: 2rem;
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1f2937, #4b5563);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const ActionButton = styled.button`
  background: linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]});
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
`

const EmptyMessage = styled.div`
  padding: 3rem;
  text-align: center;
  background: ${COLORS.gray[50]};
  border-radius: 1rem;
  color: ${COLORS.gray[600]};

  a {
    color: ${COLORS.blue[600]};
    font-weight: 600;
  }
`

export default function ShareholdersPage() {
  const router = useRouter()
  const listId =
    typeof router.query.listId === "string" ? router.query.listId : null

  return (
    <AdminLayout>
      <Container>
        <Header>
          <Title>주주명부 관리</Title>
          {listId && (
            <>
              <ActionButton
                onClick={() =>
                  router.push({
                    pathname: "/admin/change-history",
                    query: { listId },
                  })
                }>
                변경 이력
              </ActionButton>
              <ActionButton
                onClick={() =>
                  router.push({
                    pathname: "/admin/excel-import",
                    query: { listId },
                  })
                }>
                엑셀 업로드
              </ActionButton>
            </>
          )}
        </Header>
        {listId ? (
          <ShareholderList listId={listId} />
        ) : (
          <EmptyMessage>
            주주명부를 선택해 주세요.{" "}
            <Link href="/admin/lists">주주명부 목록</Link>에서 &quot;주주
            보기&quot;로 이동할 수 있습니다.
          </EmptyMessage>
        )}
      </Container>
    </AdminLayout>
  )
}
