import { useDeleteUser, useGetUsers } from "@/api/supabase"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import UserDetailModal from "./UserDetailModal"
import { User } from "@supabase/supabase-js"
import { toast } from "react-toastify"
import {
  Search,
  FilterList,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material"

const Container = styled.div`
  background: white;
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
`

const TableWrapper = styled.div`
  overflow-x: auto;
  margin: 1rem;
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
`

const Th = styled.th`
  padding: 1rem;
  background: ${COLORS.gray[50]};
  color: ${COLORS.gray[700]};
  font-weight: 600;
  font-size: 0.875rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid ${COLORS.gray[200]};

  &:first-of-type {
    padding-left: 1.5rem;
  }

  &:last-of-type {
    padding-right: 1.5rem;
  }
`

const Td = styled.td`
  padding: 1rem;
  color: ${COLORS.gray[700]};
  border-bottom: 1px solid ${COLORS.gray[100]};
  font-size: 0.875rem;

  &:first-of-type {
    padding-left: 1.5rem;
  }

  &:last-of-type {
    padding-right: 1.5rem;
  }
`

const Tr = styled.tr`
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[50]};
  }
`

const ActionButton = styled.button`
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &.edit {
    color: ${COLORS.blue[600]};
    background: ${COLORS.blue[50]};
    margin-right: 0.5rem;

    &:hover {
      background: ${COLORS.blue[100]};
    }
  }

  &.delete {
    color: ${COLORS.red[600]};
    background: ${COLORS.red[50]};

    &:hover {
      background: ${COLORS.red[100]};
    }
  }

  svg {
    font-size: 1.25rem;
  }
`

const FilterSection = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`

const FilterTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${COLORS.gray[900]};
  font-weight: 600;

  svg {
    color: ${COLORS.blue[500]};
  }
`

const SearchInputWrapper = styled.div`
  position: relative;
  flex: 1;
  max-width: 300px;

  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${COLORS.gray[400]};
    font-size: 1.25rem;
  }
`

const SearchInput = styled.input`
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  width: 100%;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: ${COLORS.gray[400]};
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
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid ${COLORS.gray[200]};
`

const PaginationInfo = styled.div`
  color: ${COLORS.gray[600]};
  font-size: 0.875rem;
`

const PaginationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`

const PageButton = styled.button<{ isActive?: boolean }>`
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  ${({ isActive }) =>
    isActive
      ? `
    background: ${COLORS.blue[500]};
    color: white;
    
    &:hover {
      background: ${COLORS.blue[600]};
    }
  `
      : `
    background: white;
    color: ${COLORS.gray[700]};
    border: 1px solid ${COLORS.gray[200]};
    
    &:hover {
      background: ${COLORS.gray[50]};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ITEMS_PER_PAGE = 10

type Filters = {
  search: string
  role: string
}

export default function UserList() {
  const { mutate: deleteUser } = useDeleteUser()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [filters, setFilters] = useState<Filters>({
    search: "",
    role: "",
  })

  const { data, isLoading } = useGetUsers(currentPage, ITEMS_PER_PAGE)

  if (isLoading) return <div>로딩 중...</div>
  if (!data) return null

  const { users, metadata } = data

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.user_metadata?.name
        ?.toLowerCase()
        .includes(filters.search.toLowerCase())

    const matchesRole =
      filters.role === "" || String(user.user_metadata.role) === filters.role

    return matchesSearch && matchesRole
  })

  const handleDeleteUser = (userId: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteUser(userId)
    } else {
      toast.error("사용자 삭제가 취소되었습니다.")
    }
  }

  return (
    <Container>
      <FilterSection>
        <FilterHeader>
          <FilterTitle>
            <FilterList />
            사용자 목록
          </FilterTitle>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <FilterSelect
              value={filters.role}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, role: e.target.value }))
              }>
              <option value="">모든 권한</option>
              <option value="user">일반 사용자</option>
              <option value="admin">관리자</option>
              <option value="root_admin">최고 관리자</option>
            </FilterSelect>
            <SearchInputWrapper>
              <Search />
              <SearchInput
                placeholder="이메일 또는 이름으로 검색..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </SearchInputWrapper>
          </div>
        </FilterHeader>
      </FilterSection>

      <TableWrapper>
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
            {filteredUsers.map((user) => (
              <Tr key={user.id}>
                <Td>{user.email}</Td>
                <Td>{user.user_metadata?.name || "-"}</Td>
                <Td>{new Date(user.created_at).toLocaleDateString()}</Td>
                <Td>
                  <UserRole
                    isAdmin={String(user.user_metadata.role).includes("admin")}>
                    {String(user.user_metadata.role) === "admin"
                      ? "관리자"
                      : String(user.user_metadata.role) === "root_admin"
                        ? "최고 관리자"
                        : "일반 사용자"}
                  </UserRole>
                </Td>
                {String(user.user_metadata.role) !== "root_admin" && (
                  <Td>
                    <ActionButton
                      className="edit"
                      onClick={() => setSelectedUser(user)}
                      title="수정">
                      <EditIcon />
                    </ActionButton>
                    <ActionButton
                      className="delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteUser(user.id)
                      }}
                      title="삭제">
                      <DeleteIcon />
                    </ActionButton>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      <PaginationContainer>
        <PaginationInfo>
          총 {filteredUsers.length}명 중{" "}
          {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}명
        </PaginationInfo>
        <PaginationButtons>
          <PageButton
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}>
            처음
          </PageButton>
          <PageButton
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}>
            이전
          </PageButton>
          {Array.from({ length: metadata.totalPages }, (_, i) => i + 1)
            .filter(
              (page) =>
                page === 1 ||
                page === metadata.totalPages ||
                Math.abs(page - currentPage) <= 2,
            )
            .map((page, index, array) =>
              index > 0 && array[index - 1] !== page - 1 ? (
                <span key={`ellipsis-${page}`}>...</span>
              ) : (
                <PageButton
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}>
                  {page}
                </PageButton>
              ),
            )}
          <PageButton
            onClick={() =>
              setCurrentPage((prev) => Math.min(metadata.totalPages, prev + 1))
            }
            disabled={currentPage === metadata.totalPages}>
            다음
          </PageButton>
          <PageButton
            onClick={() => setCurrentPage(metadata.totalPages)}
            disabled={currentPage === metadata.totalPages}>
            마지막
          </PageButton>
        </PaginationButtons>
      </PaginationContainer>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </Container>
  )
}

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  padding-right: 2.5rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background-color: white;
  min-width: 140px;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: ${COLORS.gray[400]};
  }
`
