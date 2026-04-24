import AdminLayout from "@/layouts/AdminLayout"
import {
  useShareholderLists,
  useCreateShareholderList,
  useUpdateShareholderList,
  useDeleteShareholderList,
} from "@/api/workspace"
import { useCurrentWorkspace } from "@/store/workspaceState"
import { getWorkspaceAdminBase } from "@/lib/utils"
import styled from "@emotion/styled"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import EditListModal from "@/components/admin/shareholders/EditListModal"
import Modal from "@/components/ui/modal"
import { COLORS } from "@/styles/global-style"
import type { Tables } from "@/types/db"
import GlobalSpinner from "@/components/ui/global-spinner"
import Select from "@/components/ui/select"

const LIST_NAME_PLACEHOLDER = "예: OO상장사"
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
const DEFAULT_PAGE_SIZE = 10

type ShareholderListRow = Tables<"shareholder_lists">
type ListSortKey = "name" | "active_from" | "visible"
type VisibilityFilter = "all" | "on" | "off"

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
`

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${COLORS.text.primary};
  margin: 0;
`

const CreateListButton = styled.button`
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

const ModalContent = styled.div`
  padding: 1.5rem;
  min-width: 320px;
  max-width: 90vw;
`

const ModalTitle = styled.h3`
  margin: 0 0 1rem;
  font-size: 1.125rem;
`

const ModalDescription = styled.p`
  font-size: 0.875rem;
  color: ${COLORS.gray[500]};
  margin-bottom: 1rem;
`

const ModalActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-top: 1rem;
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
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

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 8px;
  margin-bottom: 0.5rem;
`

const SectionTitle = styled.h2`
  margin: 1.5rem 0 0.75rem;
  font-size: 1rem;
  font-weight: 700;
  color: ${COLORS.gray[800]};
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
`

const Tr = styled.tr`
  &:last-child td {
    border-bottom: none;
  }
`

const FormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1rem;
`

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${COLORS.text.secondary};
`

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 160px;
`

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: ${COLORS.text.secondary};
`

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: ${COLORS.blue[600]};
  color: ${COLORS.white};
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    background: ${COLORS.blue[700]};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const LinkButton = styled(Link)`
  padding: 0.375rem 0.75rem;
  background: ${COLORS.gray[100]};
  color: ${COLORS.gray[700]};
  border-radius: 6px;
  font-size: 0.8125rem;
  text-decoration: none;
  &:hover {
    background: ${COLORS.gray[200]};
  }
`

const EmptyState = styled.p`
  padding: 2rem;
  color: ${COLORS.gray[500]};
  text-align: center;
`

const EditListButton = styled.button`
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  color: ${COLORS.blue[600]};
  background: ${COLORS.blue[50]};
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: ${COLORS.blue[100]};
  }
`

const DeleteListButton = styled.button`
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  color: ${COLORS.red[600]};
  background: ${COLORS.red[50]};
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: ${COLORS.red[100]};
  }
`

const ListNameLink = styled(Link)`
  color: ${COLORS.blue[600]};
  font-weight: 500;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

/** 워크스페이스 주주명부 목록 본문 (주주 관리는 별도 페이지 /lists/[listId]) */
export function ListsPageContent() {
  const router = useRouter()
  const [currentWorkspace] = useCurrentWorkspace()
  const [listName, setListName] = useState("")
  const [activeFrom, setActiveFrom] = useState("")
  const [activeTo, setActiveTo] = useState("")
  const [isVisible, setIsVisible] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingList, setEditingList] = useState<ShareholderListRow | null>(
    null,
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all")
  const [sortBy, setSortBy] = useState<ListSortKey>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const { data: lists = [], isLoading } = useShareholderLists(
    currentWorkspace?.id ?? null,
  )
  const createList = useCreateShareholderList()
  const updateList = useUpdateShareholderList()
  const deleteList = useDeleteShareholderList()
  const base = currentWorkspace
    ? getWorkspaceAdminBase(currentWorkspace.id)
    : "/admin"

  const listIdFromQuery =
    typeof router.query.listId === "string" ? router.query.listId : null
  useEffect(() => {
    if (
      listIdFromQuery &&
      currentWorkspace?.id &&
      typeof window !== "undefined"
    ) {
      router.replace(`${base}/lists/${listIdFromQuery}`)
    }
  }, [listIdFromQuery, currentWorkspace?.id, base, router])

  const createListPayload = () =>
    currentWorkspace?.id && listName.trim()
      ? {
          workspace_id: currentWorkspace.id,
          name: listName.trim(),
          active_from: activeFrom || null,
          active_to: activeTo || null,
          is_visible: isVisible,
        }
      : null

  const resetCreateForm = () => {
    setListName("")
    setActiveFrom("")
    setActiveTo("")
    setIsVisible(true)
    setCreateModalOpen(false)
  }

  const handleCreateAndGoToImport = () => {
    const payload = createListPayload()
    if (!payload) return
    createList.mutate(payload, {
      onSuccess: (data) => {
        resetCreateForm()
        router.push(`${base}/excel-import?listId=${data.id}`)
      },
    })
  }

  const handleCreateEmpty = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = createListPayload()
    if (!payload) return
    createList.mutate(payload, {
      onSuccess: () => {
        resetCreateForm()
      },
    })
  }

  const toggleVisible = (list: ShareholderListRow) => {
    updateList.mutate({
      id: list.id,
      is_visible: !list.is_visible,
    })
  }

  const handleDeleteList = (list: ShareholderListRow) => {
    if (
      !currentWorkspace?.id ||
      !confirm(
        `"${list.name}" 명부를 삭제하시겠습니까? 해당 명부의 주주 데이터도 함께 삭제됩니다.`,
      )
    )
      return
    deleteList.mutate({ id: list.id, workspace_id: currentWorkspace.id })
  }

  const handleRestoreList = (list: ShareholderListRow) => {
    if (!confirm(`"${list.name}" 명부를 복원할까요?`)) return
    updateList.mutate({
      id: list.id,
      archived_at: null,
    })
  }

  const activeLists = useMemo(
    () => lists.filter((list) => !list.archived_at),
    [lists],
  )
  const archivedLists = useMemo(
    () => lists.filter((list) => !!list.archived_at),
    [lists],
  )

  const filteredAndSortedLists = useMemo(() => {
    let result = activeLists.filter((list) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (list.name ?? "")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "on" && list.is_visible) ||
        (visibilityFilter === "off" && !list.is_visible)

      return matchesSearch && matchesVisibility
    })
    const mult = sortOrder === "asc" ? 1 : -1
    result = [...result].sort((a, b) => {
      if (sortBy === "name") {
        return mult * (a.name ?? "").localeCompare(b.name ?? "", "ko-KR")
      }
      if (sortBy === "active_from") {
        const ad = a.active_from ?? ""
        const bd = b.active_from ?? ""

        return mult * ad.localeCompare(bd)
      }
      if (sortBy === "visible") {
        return (
          mult * (a.is_visible === b.is_visible ? 0 : a.is_visible ? 1 : -1)
        )
      }

      return 0
    })

    return result
  }, [activeLists, searchQuery, visibilityFilter, sortBy, sortOrder])

  const totalCount = filteredAndSortedLists.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedLists = useMemo(
    () =>
      filteredAndSortedLists.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
      ),
    [filteredAndSortedLists, safePage, pageSize],
  )

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1)
  }, [page, totalPages])

  const from = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, totalCount)

  if (!currentWorkspace) return null

  return (
    <>
      <HeaderRow>
        <PageTitle>주주명부 목록</PageTitle>
        <CreateListButton
          type="button"
          onClick={() => setCreateModalOpen(true)}
          disabled={!currentWorkspace?.id}>
          새 주주명부
        </CreateListButton>
      </HeaderRow>

      <Modal open={createModalOpen} setOpen={setCreateModalOpen}>
        <ModalContent>
          <ModalTitle>새 주주명부 만들기</ModalTitle>
          <ModalDescription>
            명부명과 옵션을 입력한 뒤, 빈 명부로 만들거나 파일 가져오기 페이지로
            이동할 수 있습니다.
          </ModalDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleCreateEmpty(e)
            }}>
            <FormRow>
              <Label>
                명부명 (상장사명 등)
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder={LIST_NAME_PLACEHOLDER}
                />
              </Label>
              <Label>
                활성화 시작일
                <Input
                  type="date"
                  value={activeFrom}
                  onChange={(e) => setActiveFrom(e.target.value)}
                />
              </Label>
              <Label>
                활성화 종료일
                <Input
                  type="date"
                  value={activeTo}
                  onChange={(e) => setActiveTo(e.target.value)}
                />
              </Label>
              <ToggleLabel>
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                />
                지도 노출
              </ToggleLabel>
            </FormRow>
            <ModalActions>
              <Button type="button" onClick={() => setCreateModalOpen(false)}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={createList.isPending || !listName.trim()}>
                빈 명부 만들기
              </Button>
              <Button
                type="button"
                disabled={createList.isPending || !listName.trim()}
                onClick={handleCreateAndGoToImport}>
                명부 만들고 파일 가져오기
              </Button>
            </ModalActions>
          </form>
        </ModalContent>
      </Modal>

      <ToolbarRow>
        <SearchInput
          type="search"
          placeholder="명부명 검색"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          aria-label="명부명 검색"
        />
        <FilterSelect
          value={visibilityFilter}
          onChange={(e) => {
            setVisibilityFilter(e.target.value as VisibilityFilter)
            setPage(1)
          }}
          aria-label="노출 필터">
          <option value="all">노출 전체</option>
          <option value="on">ON</option>
          <option value="off">OFF</option>
        </FilterSelect>
        <SortSelect
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split("-") as [
              ListSortKey,
              "asc" | "desc",
            ]
            setSortBy(by)
            setSortOrder(order)
            setPage(1)
          }}
          aria-label="정렬">
          <option value="name-asc">명부명 가나다순</option>
          <option value="name-desc">명부명 가나다역순</option>
          <option value="active_from-asc">활성화 시작일 오름차순</option>
          <option value="active_from-desc">활성화 시작일 내림차순</option>
          <option value="visible-desc">노출 ON 먼저</option>
          <option value="visible-asc">노출 OFF 먼저</option>
        </SortSelect>
      </ToolbarRow>

      <TableWrap>
        <Table>
          <thead>
            <Tr>
              <Th>
                <ThSortButton
                  type="button"
                  onClick={() => {
                    const next =
                      sortBy === "visible"
                        ? sortOrder === "asc"
                          ? "desc"
                          : "asc"
                        : "desc"
                    setSortBy("visible")
                    setSortOrder(next)
                    setPage(1)
                  }}>
                  노출
                  {sortBy === "visible" && (sortOrder === "asc" ? " ↑" : " ↓")}
                </ThSortButton>
              </Th>
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
                  명부명
                  {sortBy === "name" && (sortOrder === "asc" ? " ↑" : " ↓")}
                </ThSortButton>
              </Th>
              <Th>
                <ThSortButton
                  type="button"
                  onClick={() => {
                    const next =
                      sortBy === "active_from"
                        ? sortOrder === "asc"
                          ? "desc"
                          : "asc"
                        : "asc"
                    setSortBy("active_from")
                    setSortOrder(next)
                    setPage(1)
                  }}>
                  활성화 기간
                  {sortBy === "active_from" &&
                    (sortOrder === "asc" ? " ↑" : " ↓")}
                </ThSortButton>
              </Th>
              <Th>관리</Th>
            </Tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "2rem",
                    }}>
                    <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
                  </div>
                </td>
              </tr>
            ) : lists.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState>
                    주주명부가 없습니다. 새 주주명부 버튼으로 만드세요.
                  </EmptyState>
                </td>
              </tr>
            ) : filteredAndSortedLists.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState>
                    검색·필터 결과가 없습니다.
                    {archivedLists.length > 0
                      ? " 하단의 아카이브 명부도 확인해 보세요."
                      : ""}
                  </EmptyState>
                </td>
              </tr>
            ) : (
              paginatedLists.map((list) => (
                <Tr key={list.id}>
                  <Td>
                    <ToggleLabel>
                      <input
                        type="checkbox"
                        checked={list.is_visible}
                        onChange={() => toggleVisible(list)}
                      />
                      {list.is_visible ? "ON" : "OFF"}
                    </ToggleLabel>
                  </Td>
                  <Td>
                    <ListNameLink href={`${base}/lists/${list.id}`}>
                      {list.name}
                    </ListNameLink>
                  </Td>
                  <Td>
                    {list.active_from ?? "-"} ~ {list.active_to ?? "-"}
                  </Td>
                  <Td>
                    <LinkButton href={`${base}/lists/${list.id}`}>
                      주주 보기
                    </LinkButton>
                    {" · "}
                    <EditListButton
                      type="button"
                      onClick={() => setEditingList(list)}>
                      수정
                    </EditListButton>
                    {" · "}
                    <LinkButton href={`${base}/excel-import?listId=${list.id}`}>
                      파일 가져오기
                    </LinkButton>
                    {" · "}
                    <DeleteListButton
                      type="button"
                      onClick={() => handleDeleteList(list)}
                      disabled={deleteList.isPending}
                      title="명부 삭제">
                      삭제
                    </DeleteListButton>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      {!isLoading && activeLists.length > 0 && (
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

      {!isLoading && archivedLists.length > 0 && (
        <>
          <SectionTitle>아카이브된 주주명부</SectionTitle>
          <TableWrap>
            <Table>
              <thead>
                <Tr>
                  <Th>명부명</Th>
                  <Th>아카이브일</Th>
                  <Th>관리</Th>
                </Tr>
              </thead>
              <tbody>
                {archivedLists
                  .slice()
                  .sort((a, b) =>
                    String(b.archived_at ?? "").localeCompare(
                      String(a.archived_at ?? ""),
                    ),
                  )
                  .map((list) => (
                    <Tr key={`archived-${list.id}`}>
                      <Td>{list.name}</Td>
                      <Td>{list.archived_at?.slice(0, 10) ?? "-"}</Td>
                      <Td>
                        <LinkButton href={`${base}/lists/${list.id}`}>
                          주주 보기
                        </LinkButton>
                        {" · "}
                        <EditListButton
                          type="button"
                          onClick={() => handleRestoreList(list)}>
                          복원
                        </EditListButton>
                      </Td>
                    </Tr>
                  ))}
              </tbody>
            </Table>
          </TableWrap>
        </>
      )}

      {editingList && (
        <EditListModal
          list={editingList}
          onClose={() => setEditingList(null)}
        />
      )}
    </>
  )
}

export default function AdminListsPage() {
  const router = useRouter()
  const [currentWorkspace] = useCurrentWorkspace()

  useEffect(() => {
    if (currentWorkspace && typeof window !== "undefined")
      router.replace(`/workspaces/${currentWorkspace.id}/admin/lists`)
  }, [currentWorkspace, router])

  if (currentWorkspace) return null

  return (
    <AdminLayout>
      <PageTitle>주주명부 목록</PageTitle>
      <EmptyState>워크스페이스를 선택해 주세요.</EmptyState>
    </AdminLayout>
  )
}
