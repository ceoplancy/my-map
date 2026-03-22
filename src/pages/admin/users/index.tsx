import AdminLayout from "@/layouts/AdminLayout"
import UserList from "@/components/admin/users/UserList"
import UserForm from "@/components/admin/users/UserForm"
import { useAdminStatus } from "@/api/auth"
import { useState } from "react"
import styled from "@emotion/styled"
import Link from "next/link"
import { COLORS } from "@/styles/global-style"

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

const AddButton = styled.button`
  background: linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]});
  color: ${COLORS.background.white};
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: translateY(0);
  }
`

const ForbiddenMessage = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${COLORS.gray[600]};
  a {
    color: ${COLORS.blue[600]};
    font-weight: 600;
  }
`

export default function UsersPage() {
  const { data: adminStatus, isLoading: adminStatusLoading } = useAdminStatus()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const isServiceAdmin = adminStatus?.isServiceAdmin ?? false
  if (!adminStatusLoading && !isServiceAdmin) {
    return (
      <AdminLayout>
        <Container>
          <ForbiddenMessage>
            사용자 관리는 통합 관리자만 이용할 수 있습니다.{" "}
            <Link href="/admin/integrated">대시보드로 이동</Link>
          </ForbiddenMessage>
        </Container>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Container>
        <Header>
          <Title>사용자 관리</Title>
          <AddButton onClick={() => setIsCreateModalOpen(true)}>
            새 사용자 추가
          </AddButton>
        </Header>
        <UserList />
        {isCreateModalOpen && (
          <UserForm onClose={() => setIsCreateModalOpen(false)} />
        )}
      </Container>
    </AdminLayout>
  )
}
