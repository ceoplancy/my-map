import { useDeleteUser, useGetUsers } from "@/api/supabase"
import styled from "styled-components"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import UserDetailModal from "./UserDetailModal"
import { User } from "@supabase/supabase-js"
import { toast } from "react-toastify"

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
`

const Th = styled.th`
  text-align: left;
  padding: 1rem;
  background: ${COLORS.gray[50]};
  color: ${COLORS.gray[600]};
  font-weight: 600;
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid ${COLORS.gray[100]};
  color: ${COLORS.gray[700]};
`

const Tr = styled.tr`
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: ${COLORS.gray[50]};
  }
`

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &.edit {
    color: ${COLORS.blue[600]};
    background: ${COLORS.blue[50]};

    &:hover {
      background: ${COLORS.blue[100]};
    }
  }

  &.delete {
    color: ${COLORS.red[600]};
    background: ${COLORS.red[50]};
    margin-left: 0.5rem;

    &:hover {
      background: ${COLORS.red[100]};
    }
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
`

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
`

const PageButton = styled.button<{ isActive?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
  background: ${(props) =>
    props.isActive ? COLORS.blue[500] : COLORS.gray[50]};
  color: ${(props) => (props.isActive ? "white" : COLORS.gray[700])};

  &:hover {
    background: ${(props) =>
      props.isActive ? COLORS.blue[600] : COLORS.gray[100]};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const PageInfo = styled.span`
  color: ${COLORS.gray[600]};
  font-size: 0.875rem;
`

const ITEMS_PER_PAGE = 10

export default function UserList() {
  const { mutate: deleteUser } = useDeleteUser()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const { data, isLoading } = useGetUsers(currentPage, ITEMS_PER_PAGE)

  if (isLoading) return <div>로딩 중...</div>
  if (!data) return null

  const { users, metadata } = data
  const handleDeleteUser = (userId: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteUser(userId)
    } else {
      toast.error("사용자 삭제가 취소되었습니다.")
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>이메일</Th>
            <Th>이름</Th>
            <Th>가입일</Th>
            <Th>권한</Th>
            <Th>작업</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <Tr key={user.id}>
              <Td>{user.email}</Td>
              <Td>{user.user_metadata?.name || "-"}</Td>
              <Td>{new Date(user.created_at).toLocaleDateString()}</Td>
              <Td>
                <UserRole
                  isAdmin={String(user.user_metadata.role).includes("admin")}>
                  {String(user.user_metadata.role).includes("admin")
                    ? "관리자"
                    : "사용자"}
                </UserRole>
              </Td>
              {String(user.user_metadata.role) !== "root_admin" && (
                <Td>
                  <ActionButton
                    className="edit"
                    onClick={() => setSelectedUser(user)}>
                    상세/수정
                  </ActionButton>
                  <ActionButton
                    className="delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteUser(user.id)
                    }}>
                    삭제
                  </ActionButton>
                </Td>
              )}
            </Tr>
          ))}
        </tbody>
      </Table>

      <PaginationContainer>
        <PageButton
          className="navigation"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}>
          {"<<"}
        </PageButton>
        <PageButton
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}>
          {"<"}
        </PageButton>

        {Array.from({ length: metadata.totalPages }, (_, i) => i + 1)
          .filter(
            (page) =>
              page === 1 ||
              page === metadata.totalPages ||
              Math.abs(page - currentPage) <= 2,
          )
          .map((page, index, array) => (
            <>
              {index > 0 && array[index - 1] !== page - 1 && (
                <PageInfo key={`ellipsis-${page}`}>...</PageInfo>
              )}
              <PageButton
                key={page}
                onClick={() => handlePageChange(page)}
                isActive={currentPage === page}>
                {page}
              </PageButton>
            </>
          ))}

        <PageButton
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!metadata.hasMore}>
          {">"}
        </PageButton>
        <PageButton
          className="navigation"
          onClick={() => handlePageChange(metadata.totalPages)}
          disabled={currentPage === metadata.totalPages}>
          {">>"}
        </PageButton>
      </PaginationContainer>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  )
}
