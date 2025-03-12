import { useGetUsers, useDeleteUser } from "@/api/supabase"
import Link from "next/link"
import styled from "styled-components"

const TableContainer = styled.div`
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
`

const Table = styled.table`
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
`

const TableHead = styled.thead`
  background-color: #f9fafb;
`

const TableHeader = styled.th`
  padding: 0.75rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: #6b7280;
  letter-spacing: 0.05em;
`

const TableBody = styled.tbody`
  background-color: white;
  & > tr {
    border-top: 1px solid #e5e7eb;
  }
`

const TableCell = styled.td`
  padding: 1rem 1.5rem;
  white-space: nowrap;
`

const ActionLink = styled(Link)`
  color: #2563eb;
  &:hover {
    color: #1d4ed8;
  }
`

const DeleteButton = styled.button`
  color: #dc2626;
  margin-left: 0.5rem;
  &:hover {
    color: #b91c1c;
  }
`

const LoadingText = styled.div`
  padding: 1rem;
  text-align: center;
  color: #6b7280;
`

export default function UserList() {
  const { data: users, isLoading } = useGetUsers()
  const deleteUserMutation = useDeleteUser()

  if (isLoading) return <LoadingText>로딩 중...</LoadingText>
  if (!users) return null

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <tr>
            <TableHeader>이메일</TableHeader>
            <TableHeader>이름</TableHeader>
            <TableHeader>가입일</TableHeader>
            <TableHeader>작업</TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {users.users.map((user) => (
            <tr key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.user_metadata?.name || "-"}</TableCell>
              <TableCell>
                {new Date(user.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <ActionLink href={`/admin/users/${user.id}`}>상세</ActionLink>
                <DeleteButton
                  onClick={() => {
                    if (confirm("정말 삭제하시겠습니까?")) {
                      deleteUserMutation.mutate(user.id)
                    }
                  }}>
                  삭제
                </DeleteButton>
              </TableCell>
            </tr>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
