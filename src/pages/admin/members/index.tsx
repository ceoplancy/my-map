import AdminLayout from "@/layouts/AdminLayout"
import { useCurrentWorkspace } from "@/store/workspaceState"
import {
  useWorkspaceMembersWithUsers,
  useShareholderLists,
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMember,
  type WorkspaceMemberWithUser,
} from "@/api/workspace"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import type { WorkspaceRole, MyWorkspaceItem } from "@/types/db"
import { WORKSPACE_ROLE_LABELS } from "@/constants/roles"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/router"
import Modal from "@/components/ui/modal"
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material"
import GlobalSpinner from "@/components/ui/global-spinner"
import Select from "@/components/ui/select"

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
const DEFAULT_PAGE_SIZE = 10

/** 워크스페이스 사용자 관리에서 노출할 역할 (서비스 관리자 제외) */
const ROLES_IN_WORKSPACE_MEMBERS = (
  Object.keys(WORKSPACE_ROLE_LABELS) as WorkspaceRole[]
).filter((r) => r !== "service_admin")

type MemberSortKey = "name" | "email" | "role"

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0;
`

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${COLORS.text.primary};
  margin: 0;
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0;
`

const SearchInput = styled.input`
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 6px;
  min-width: 160px;
  max-width: 220px;
  &::placeholder {
    color: ${COLORS.gray[500]};
  }
`

const FilterSelect = styled(Select)``

const SortSelect = styled(Select)`
  margin-left: auto;
`

const PaginationWrap = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.75rem 0;
  font-size: 0.875rem;
  color: ${COLORS.gray[600]};
`

const PageSizeSelect = styled(Select)`
  padding: 0.35rem 1.5rem 0.35rem 0.5rem;
  font-size: 0.8125rem;
  background-size: 0.875rem;
  background-position: right 0.35rem center;
`

const PageBtn = styled.button`
  padding: 0.35rem 0.6rem;
  font-size: 0.8125rem;
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 6px;
  background: white;
  color: ${COLORS.gray[700]};
  cursor: pointer;
  &:hover:not(:disabled) {
    background: ${COLORS.gray[50]};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 8px;
  margin-bottom: 0.5rem;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`

const Th = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  background: ${COLORS.gray[50]};
  font-weight: 600;
  color: ${COLORS.gray[700]};
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const ThSortButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  &:hover {
    color: ${COLORS.gray[900]};
  }
`

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${COLORS.gray[200]};
  color: ${COLORS.gray[700]};
`

const Tr = styled.tr`
  &:last-child td {
    border-bottom: none;
  }
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

const EmptyState = styled.p`
  padding: 2rem;
  color: ${COLORS.gray[500]};
  text-align: center;
  margin: 0;
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

const FieldSelect = styled(Select)`
  width: 100%;
  margin-bottom: 1rem;
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

const EditBtn = styled.button`
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  color: ${COLORS.blue[600]};
  background: ${COLORS.blue[50]};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  &:hover {
    background: ${COLORS.blue[100]};
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
  const { data: membersRaw = [], isLoading } = useWorkspaceMembersWithUsers(
    workspace?.id ?? null,
  )
  const members = useMemo(
    () => membersRaw.filter((m) => m.role !== "service_admin"),
    [membersRaw],
  )
  const { data: lists = [] } = useShareholderLists(workspace?.id ?? null)
  const addMember = useAddWorkspaceMember()
  const removeMember = useRemoveWorkspaceMember()
  const updateMember = useUpdateWorkspaceMember()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addName, setAddName] = useState("")
  const [addPassword, setAddPassword] = useState("")
  const [addRole, setAddRole] = useState<WorkspaceRole>("field_agent")
  const [addAllowedListIds, setAddAllowedListIds] = useState<string[]>([])
  const [editMember, setEditMember] = useState<WorkspaceMemberWithUser | null>(
    null,
  )
  const [editRole, setEditRole] = useState<WorkspaceRole>("field_agent")
  const [editAllowedListIds, setEditAllowedListIds] = useState<string[]>([])
  const [editIsTeamLeader, setEditIsTeamLeader] = useState(false)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<MemberSortKey>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const highlightedRowRef = useRef<HTMLTableRowElement>(null)
  const router = useRouter()
  const userIdFromQuery =
    typeof router.query.userId === "string" ? router.query.userId : null

  const listNamesById = Object.fromEntries(lists.map((l) => [l.id, l.name]))

  const filteredMembers = useMemo(() => {
    let result = members
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      result = result.filter(
        (m) =>
          (m.name ?? "").toLowerCase().includes(term) ||
          (m.email ?? "").toLowerCase().includes(term),
      )
    }
    if (roleFilter !== "all") {
      result = result.filter((m) => m.role === roleFilter)
    }

    return result
  }, [members, search, roleFilter])

  const sortedMembers = useMemo(() => {
    const mult = sortOrder === "asc" ? 1 : -1

    return [...filteredMembers].sort((a, b) => {
      if (sortBy === "name") {
        return mult * (a.name ?? "").localeCompare(b.name ?? "", "ko-KR")
      }
      if (sortBy === "email") {
        return mult * (a.email ?? "").localeCompare(b.email ?? "")
      }
      if (sortBy === "role") {
        return mult * (a.role ?? "").localeCompare(b.role ?? "")
      }

      return 0
    })
  }, [filteredMembers, sortBy, sortOrder])

  const totalCount = sortedMembers.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedMembers = useMemo(
    () => sortedMembers.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedMembers, safePage, pageSize],
  )

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1)
  }, [page, totalPages])

  const from = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, totalCount)

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

  const openEditMember = (m: WorkspaceMemberWithUser) => {
    setEditMember(m)
    setEditRole(m.role as WorkspaceRole)
    setEditAllowedListIds(
      Array.isArray(m.allowed_list_ids) ? [...m.allowed_list_ids] : [],
    )
    setEditIsTeamLeader(Boolean(m.is_team_leader))
  }

  const toggleEditAllowedList = (listId: string) => {
    setEditAllowedListIds((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId],
    )
  }

  const handleSaveEditMember = () => {
    if (!workspace?.id || !editMember) return
    updateMember.mutate(
      {
        workspaceId: workspace.id,
        memberId: editMember.id,
        role: editRole,
        allowed_list_ids:
          editAllowedListIds.length > 0 ? editAllowedListIds : null,
        is_team_leader: editIsTeamLeader,
      },
      {
        onSuccess: () => setEditMember(null),
      },
    )
  }

  const handleRemoveMember = (memberId: string) => {
    if (!workspace?.id) return
    if (!confirm("이 멤버를 워크스페이스에서 제거하시겠습니까?")) return
    removeMember.mutate({ workspaceId: workspace.id, memberId })
  }

  useEffect(() => {
    if (!userIdFromQuery || !highlightedRowRef.current) return
    highlightedRowRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  }, [userIdFromQuery, paginatedMembers.length])

  if (!workspace) return null

  return (
    <Container>
      <HeaderRow>
        <PageTitle>사용자 관리</PageTitle>
        <AddButton type="button" onClick={() => setAddModalOpen(true)}>
          멤버 추가
        </AddButton>
      </HeaderRow>
      <ToolbarRow>
        <SearchInput
          type="search"
          placeholder="이름 또는 이메일로 검색"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          aria-label="멤버 검색"
        />
        <FilterSelect
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
          }}
          aria-label="역할 필터">
          <option value="all">역할 전체</option>
          {ROLES_IN_WORKSPACE_MEMBERS.map((r) => (
            <option key={r} value={r}>
              {WORKSPACE_ROLE_LABELS[r]}
            </option>
          ))}
        </FilterSelect>
        <SortSelect
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split("-") as [
              MemberSortKey,
              "asc" | "desc",
            ]
            setSortBy(by)
            setSortOrder(order)
            setPage(1)
          }}
          aria-label="정렬">
          <option value="name-asc">이름 가나다순</option>
          <option value="name-desc">이름 가나다역순</option>
          <option value="email-asc">이메일 가나다순</option>
          <option value="email-desc">이메일 가나다역순</option>
          <option value="role-asc">역할 오름차순</option>
          <option value="role-desc">역할 내림차순</option>
        </SortSelect>
      </ToolbarRow>
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
            {ROLES_IN_WORKSPACE_MEMBERS.map((r) => (
              <option key={r} value={r}>
                {WORKSPACE_ROLE_LABELS[r]}
              </option>
            ))}
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
      <Modal
        open={!!editMember}
        setOpen={(open) => {
          if (!open) setEditMember(null)
        }}>
        <ModalContent>
          <ModalTitle>멤버 수정</ModalTitle>
          {editMember ? (
            <>
              <FieldLabel>이메일</FieldLabel>
              <FieldInput
                type="text"
                value={editMember.email ?? ""}
                disabled
                readOnly
                style={{ opacity: 0.85 }}
              />
              <FieldLabel>이름</FieldLabel>
              <FieldInput
                type="text"
                value={editMember.name ?? ""}
                disabled
                readOnly
                style={{ opacity: 0.85 }}
              />
              <FieldLabel>역할</FieldLabel>
              <FieldSelect
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as WorkspaceRole)}>
                {ROLES_IN_WORKSPACE_MEMBERS.map((r) => (
                  <option key={r} value={r}>
                    {WORKSPACE_ROLE_LABELS[r]}
                  </option>
                ))}
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
                          checked={editAllowedListIds.includes(list.id)}
                          onChange={() => toggleEditAllowedList(list.id)}
                        />{" "}
                        {list.name}
                      </label>
                    ))}
                  </div>
                </>
              )}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                }}>
                <input
                  type="checkbox"
                  checked={editIsTeamLeader}
                  onChange={(e) => setEditIsTeamLeader(e.target.checked)}
                />
                팀장
              </label>
              <ModalActions>
                <ModalButton
                  type="button"
                  onClick={() => setEditMember(null)}
                  disabled={updateMember.isPending}>
                  취소
                </ModalButton>
                <ModalButton
                  primary
                  type="button"
                  onClick={handleSaveEditMember}
                  disabled={updateMember.isPending}>
                  {updateMember.isPending ? "저장 중…" : "저장"}
                </ModalButton>
              </ModalActions>
            </>
          ) : null}
        </ModalContent>
      </Modal>
      <TableWrap>
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem",
            }}>
            <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>
                  <ThSortButton
                    type="button"
                    onClick={() => {
                      const next =
                        sortBy === "name"
                          ? sortOrder === "asc"
                            ? "desc"
                            : "asc"
                          : "asc"
                      setSortBy("name")
                      setSortOrder(next)
                      setPage(1)
                    }}>
                    이름
                    {sortBy === "name" && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </ThSortButton>
                </Th>
                <Th>
                  <ThSortButton
                    type="button"
                    onClick={() => {
                      const next =
                        sortBy === "email"
                          ? sortOrder === "asc"
                            ? "desc"
                            : "asc"
                          : "asc"
                      setSortBy("email")
                      setSortOrder(next)
                      setPage(1)
                    }}>
                    이메일
                    {sortBy === "email" && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </ThSortButton>
                </Th>
                <Th>
                  <ThSortButton
                    type="button"
                    onClick={() => {
                      const next =
                        sortBy === "role"
                          ? sortOrder === "asc"
                            ? "desc"
                            : "asc"
                          : "asc"
                      setSortBy("role")
                      setSortOrder(next)
                      setPage(1)
                    }}>
                    역할
                    {sortBy === "role" && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </ThSortButton>
                </Th>
                <Th>담당 명부</Th>
                <Th>팀장</Th>
                <Th>작업</Th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>
                      멤버가 없습니다. 멤버 추가 버튼으로 만드세요.
                    </EmptyState>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>검색 결과가 없습니다.</EmptyState>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m) => {
                  const isHighlighted = userIdFromQuery === m.user_id

                  return (
                    <Tr
                      key={m.id}
                      ref={isHighlighted ? highlightedRowRef : undefined}
                      style={
                        isHighlighted
                          ? { backgroundColor: COLORS.blue[50] }
                          : undefined
                      }>
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
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                          }}>
                          <EditBtn
                            type="button"
                            onClick={() => openEditMember(m)}
                            disabled={updateMember.isPending}
                            title="멤버 수정">
                            <EditIcon sx={{ fontSize: 18 }} />
                            수정
                          </EditBtn>
                          <DeleteBtn
                            type="button"
                            onClick={() => handleRemoveMember(m.id)}
                            disabled={removeMember.isPending}
                            title="멤버 제거">
                            <DeleteIcon sx={{ fontSize: 18 }} />
                            삭제
                          </DeleteBtn>
                        </div>
                      </Td>
                    </Tr>
                  )
                })
              )}
            </tbody>
          </Table>
        )}
      </TableWrap>
      {!isLoading && members.length > 0 && (
        <PaginationWrap>
          <span>
            총 {totalCount}건{totalCount > 0 && ` (${from}–${to} 표시)`}
          </span>
          <PageSizeSelect
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            aria-label="페이지당 개수">
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}개씩
              </option>
            ))}
          </PageSizeSelect>
          <PageBtn
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="이전 페이지">
            이전
          </PageBtn>
          <span>
            {safePage} / {totalPages}
          </span>
          <PageBtn
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="다음 페이지">
            다음
          </PageBtn>
        </PaginationWrap>
      )}
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
        <HeaderRow>
          <PageTitle>사용자 관리</PageTitle>
        </HeaderRow>
        <EmptyState>워크스페이스를 선택해 주세요.</EmptyState>
      </Container>
    </AdminLayout>
  )
}
