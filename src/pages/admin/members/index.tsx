import AdminLayout from "@/layouts/AdminLayout"
import { useCurrentWorkspace } from "@/store/workspaceState"
import {
  useWorkspaceMembersWithUsers,
  useShareholderLists,
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
} from "@/api/workspace"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import type { WorkspaceRole, MyWorkspaceItem } from "@/types/db"
import { WORKSPACE_ROLE_LABELS } from "@/constants/roles"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Modal from "@/components/ui/modal"
import { Delete as DeleteIcon } from "@mui/icons-material"
import GlobalSpinner from "@/components/ui/global-spinner"

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

const ModalContent = styled.div`
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

const DeleteBtn = styled.button`
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  color: ${COLORS.red[600]};
  background: ${COLORS.red[50]};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  &:hover {
    background: ${COLORS.red[100]};
  }
`

/** 워크스페이스 멤버 본문 (workspace 설정된 상태에서 사용) */
export function MembersPageContent({
  initialWorkspace = null,
}: {
  initialWorkspace?: MyWorkspaceItem | null
} = {}) {
  const [storeWorkspace] = useCurrentWorkspace()
  const workspace = storeWorkspace ?? initialWorkspace ?? null
  const { data: members = [], isLoading } = useWorkspaceMembersWithUsers(
    workspace?.id ?? null,
  )
  const { data: lists = [] } = useShareholderLists(workspace?.id ?? null)
  const addMember = useAddWorkspaceMember()
  const removeMember = useRemoveWorkspaceMember()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addName, setAddName] = useState("")
  const [addPassword, setAddPassword] = useState("")
  const [addRole, setAddRole] = useState<WorkspaceRole>("field_agent")
  const [addAllowedListIds, setAddAllowedListIds] = useState<string[]>([])

  const listNamesById = Object.fromEntries(lists.map((l) => [l.id, l.name]))

  /** 담당 명부 이름 배열을 가나다순 정렬 후, 많으면 앞 N개만 보여주고 "외 M개" 표시 */
  const formatAssignedLists = (
    allowedListIds: string[] | null | undefined,
    maxVisible = 3,
  ): string => {
    if (!allowedListIds?.length) return "-"
    const names = allowedListIds
      .map((id) => listNamesById[id] ?? id)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ko-KR"))
    if (names.length === 0) return "-"
    if (names.length <= maxVisible) return names.join(", ")
    const visible = names.slice(0, maxVisible).join(", ")

    return `${visible} 외 ${names.length - maxVisible}개`
  }

  const handleAddMember = () => {
    if (!workspace?.id || !addEmail.trim()) return
    addMember.mutate(
      {
        workspaceId: workspace.id,
        email: addEmail.trim(),
        role: addRole,
        name: addName.trim() || undefined,
        password: addPassword.trim() || undefined,
        allowed_list_ids:
          addAllowedListIds.length > 0 ? addAllowedListIds : null,
      },
      {
        onSuccess: () => {
          setAddModalOpen(false)
          setAddEmail("")
          setAddName("")
          setAddPassword("")
          setAddRole("field_agent")
          setAddAllowedListIds([])
        },
      },
    )
  }

  const toggleAllowedList = (listId: string) => {
    setAddAllowedListIds((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId],
    )
  }

  const handleRemoveMember = (memberId: string) => {
    if (!workspace?.id) return
    if (!confirm("이 멤버를 워크스페이스에서 제거하시겠습니까?")) return
    removeMember.mutate({ workspaceId: workspace.id, memberId })
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
      <Modal open={addModalOpen} setOpen={setAddModalOpen}>
        <ModalContent>
          <ModalTitle>멤버 추가</ModalTitle>
          <FieldLabel>이메일 (필수)</FieldLabel>
          <FieldInput
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="example@email.com"
          />
          <FieldLabel>이름 (선택)</FieldLabel>
          <FieldInput
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="표시 이름"
          />
          <FieldLabel>
            비밀번호 (선택, 미가입 사용자일 때 6자 이상 입력 시 새 계정 생성)
          </FieldLabel>
          <FieldInput
            type="password"
            value={addPassword}
            onChange={(e) => setAddPassword(e.target.value)}
            placeholder="6자 이상"
            autoComplete="new-password"
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
          {lists.length > 0 && (
            <>
              <FieldLabel>
                담당 명부 (용역만 해당, 선택한 명부만 지도에서 조회 가능)
              </FieldLabel>
              <div
                style={{
                  marginBottom: "1rem",
                  maxHeight: "120px",
                  overflowY: "auto",
                }}>
                {lists.map((list) => (
                  <label
                    key={list.id}
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      marginBottom: "0.25rem",
                    }}>
                    <input
                      type="checkbox"
                      checked={addAllowedListIds.includes(list.id)}
                      onChange={() => toggleAllowedList(list.id)}
                    />{" "}
                    {list.name}
                  </label>
                ))}
              </div>
            </>
          )}
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
        </ModalContent>
      </Modal>
      <TableWrapper>
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem",
            }}>
            <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
          </div>
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
                <Th>작업</Th>
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
                  <Td>{formatAssignedLists(m.allowed_list_ids)}</Td>
                  <Td>{m.is_team_leader ? "예" : "-"}</Td>
                  <Td>
                    <DeleteBtn
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      disabled={removeMember.isPending}
                      title="멤버 제거">
                      <DeleteIcon sx={{ fontSize: 18 }} />
                      삭제
                    </DeleteBtn>
                  </Td>
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
