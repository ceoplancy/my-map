import AdminLayout from "@/layouts/AdminLayout"
import { useCurrentWorkspace } from "@/store/workspaceState"
import {
  useWorkspaceMembersWithUsers,
  useShareholderLists,
  useAddWorkspaceMember,
} from "@/api/workspace"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import type { WorkspaceRole } from "@/types/db"
import { WORKSPACE_ROLE_LABELS } from "@/constants/roles"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`

const Header = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, white, #f8fafc);
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
`

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1f2937, #4b5563);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const TableWrapper = styled.div`
  overflow-x: auto;
  background: white;
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const Td = styled.td`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${COLORS.gray[100]};
  font-size: 0.875rem;
  color: ${COLORS.gray[700]};
`

const RoleBadge = styled.span<{ role: WorkspaceRole }>`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ role }) =>
    role === "service_admin"
      ? COLORS.purple[100]
      : role === "top_admin"
        ? COLORS.blue[100]
        : role === "admin"
          ? COLORS.green[100]
          : COLORS.gray[100]};
  color: ${({ role }) =>
    role === "service_admin"
      ? COLORS.purple[700]
      : role === "top_admin"
        ? COLORS.blue[700]
        : role === "admin"
          ? COLORS.green[700]
          : COLORS.gray[700]};
`

const EmptyMessage = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${COLORS.gray[600]};
`

const AddButton = styled.button`
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]});
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-left: auto;

  &:hover {
    opacity: 0.95;
  }
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
`

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const ModalBox = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  min-width: 320px;
  max-width: 90vw;
`

const ModalTitle = styled.h3`
  margin: 0 0 1rem;
  font-size: 1.125rem;
`

const FieldLabel = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${COLORS.gray[700]};
  margin-bottom: 0.25rem;
`

const FieldInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 8px;
  margin-bottom: 1rem;
  box-sizing: border-box;
`

const FieldSelect = styled.select`
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 8px;
  margin-bottom: 1rem;
  box-sizing: border-box;
`

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
`

const ModalButton = styled.button<{ primary?: boolean }>`
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background: ${(p) => (p.primary ? COLORS.blue[500] : COLORS.gray[200])};
  color: ${(p) => (p.primary ? "white" : COLORS.gray[800])};
`

/** 워크스페이스 멤버 본문 (workspace 설정된 상태에서 사용) */
export function MembersPageContent() {
  const [workspace] = useCurrentWorkspace()
  const { data: members = [], isLoading } = useWorkspaceMembersWithUsers(
    workspace?.id ?? null,
  )
  const { data: lists = [] } = useShareholderLists(workspace?.id ?? null)
  const addMember = useAddWorkspaceMember()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addRole, setAddRole] = useState<WorkspaceRole>("field_agent")

  const listNamesById = Object.fromEntries(lists.map((l) => [l.id, l.name]))

  const handleAddMember = () => {
    if (!workspace?.id || !addEmail.trim()) return
    addMember.mutate(
      { workspaceId: workspace.id, email: addEmail.trim(), role: addRole },
      {
        onSuccess: () => {
          setAddModalOpen(false)
          setAddEmail("")
          setAddRole("field_agent")
        },
      },
    )
  }

  if (!workspace) return null

  return (
    <Container>
      <Header>
        <HeaderRow>
          <Title>워크스페이스 멤버</Title>
          <AddButton type="button" onClick={() => setAddModalOpen(true)}>
            멤버 추가
          </AddButton>
        </HeaderRow>
      </Header>
      {addModalOpen && (
        <ModalOverlay onClick={() => setAddModalOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalTitle>멤버 추가</ModalTitle>
            <FieldLabel>이메일</FieldLabel>
            <FieldInput
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="가입된 사용자 이메일"
            />
            <FieldLabel>역할</FieldLabel>
            <FieldSelect
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as WorkspaceRole)}>
              {(Object.keys(WORKSPACE_ROLE_LABELS) as WorkspaceRole[]).map(
                (r) => (
                  <option key={r} value={r}>
                    {WORKSPACE_ROLE_LABELS[r]}
                  </option>
                ),
              )}
            </FieldSelect>
            <ModalActions>
              <ModalButton type="button" onClick={() => setAddModalOpen(false)}>
                취소
              </ModalButton>
              <ModalButton
                primary
                type="button"
                onClick={handleAddMember}
                disabled={addMember.isPending || !addEmail.trim()}>
                {addMember.isPending ? "추가 중…" : "추가"}
              </ModalButton>
            </ModalActions>
          </ModalBox>
        </ModalOverlay>
      )}
      <TableWrapper>
        {isLoading ? (
          <div style={{ padding: "2rem" }}>로딩 중...</div>
        ) : members.length === 0 ? (
          <EmptyMessage>멤버가 없습니다.</EmptyMessage>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>이름</Th>
                <Th>이메일</Th>
                <Th>역할</Th>
                <Th>담당 명부</Th>
                <Th>팀장</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <Td>{m.name ?? "-"}</Td>
                  <Td>{m.email ?? "-"}</Td>
                  <Td>
                    <RoleBadge role={m.role as WorkspaceRole}>
                      {WORKSPACE_ROLE_LABELS[m.role as WorkspaceRole]}
                    </RoleBadge>
                  </Td>
                  <Td>
                    {m.allowed_list_ids?.length
                      ? m.allowed_list_ids
                          .map((id) => listNamesById[id] ?? id)
                          .join(", ")
                      : "-"}
                  </Td>
                  <Td>{m.is_team_leader ? "예" : "-"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableWrapper>
    </Container>
  )
}

export default function AdminMembersPage() {
  const router = useRouter()
  const [currentWorkspace] = useCurrentWorkspace()

  useEffect(() => {
    if (currentWorkspace && typeof window !== "undefined")
      router.replace(`/workspaces/${currentWorkspace.id}/admin/users`)
  }, [currentWorkspace, router])

  if (currentWorkspace) return null

  return (
    <AdminLayout>
      <Container>
        <Header>
          <Title>워크스페이스 멤버</Title>
        </Header>
        <EmptyMessage>워크스페이스를 선택해 주세요.</EmptyMessage>
      </Container>
    </AdminLayout>
  )
}
