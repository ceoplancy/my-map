import AdminLayout from "@/layouts/AdminLayout"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import ShareholderList from "@/components/admin/shareholders/ShareholderList"
import { useRouter } from "next/navigation"

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

export default function ShareholdersPage() {
  const router = useRouter()

  return (
    <AdminLayout>
      <Container>
        <Header>
          <Title>주주명부 관리</Title>
          {/* <ActionButton onClick={() => setIsUploadModalOpen(true)}> */}
          <ActionButton onClick={() => router.push("/admin/excel-import")}>
            엑셀 업로드
          </ActionButton>
        </Header>
        <ShareholderList />
      </Container>
    </AdminLayout>
  )
}
