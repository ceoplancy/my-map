import AdminLayout from "@/layouts/AdminLayout"
import UserList from "@/components/admin/users/UserList"
import UserForm from "@/components/admin/users/UserForm"
import { useState } from "react"
import styled from "styled-components"
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

const UserRole = styled.span<{ isAdmin: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  background: ${(props) =>
    props.isAdmin
      ? "linear-gradient(135deg, #ddd6fe, #c4b5fd)"
      : "linear-gradient(135deg, #f3f4f6, #e5e7eb)"};
  color: ${(props) => (props.isAdmin ? "#6d28d9" : "#374151")};
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`

export default function UsersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

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
