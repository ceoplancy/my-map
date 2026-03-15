import AdminLayout from "@/layouts/AdminLayout"
import {
  useShareholderLists,
  useCreateShareholderList,
  useUpdateShareholderList,
} from "@/api/workspace"
import { useCurrentWorkspace } from "@/store/workspaceState"
import { getWorkspaceAdminBase } from "@/lib/utils"
import styled from "@emotion/styled"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import ShareholderList from "@/components/admin/shareholders/ShareholderList"
import { COLORS } from "@/styles/global-style"
import type { Tables } from "@/types/db"

const LIST_NAME_PLACEHOLDER = "예: OO상장사"

type ShareholderListRow = Tables<"shareholder_lists">

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: ${COLORS.text.primary};
`

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 8px;
  margin-bottom: 2rem;
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

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const Tr = styled.tr`
  &:last-child td {
    border-bottom: none;
  }
`

const FormSection = styled.section`
  background: ${COLORS.gray[50]};
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
`

const FormTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${COLORS.text.primary};
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

const SelectListButton = styled.button`
  padding: 0.375rem 0.75rem;
  background: ${COLORS.gray[100]};
  color: ${COLORS.gray[700]};
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  cursor: pointer;
  &:hover {
    background: ${COLORS.gray[200]};
  }
`

const EmptyState = styled.p`
  padding: 2rem;
  color: ${COLORS.gray[500]};
  text-align: center;
`

const ManagementSection = styled.section`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid ${COLORS.gray[200]};
`

const ManagementHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`

const ManagementTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${COLORS.text.primary};
`

const ManagementActions = styled.div`
  display: flex;
  gap: 0.5rem;
`

const EmptyManagement = styled.div`
  padding: 3rem;
  text-align: center;
  background: ${COLORS.gray[50]};
  border-radius: 1rem;
  color: ${COLORS.gray[600]};
  font-size: 0.9375rem;
`

/** 워크스페이스 주주명부 목록·관리 통합 본문 */
export function ListsPageContent() {
  const router = useRouter()
  const [currentWorkspace] = useCurrentWorkspace()
  const listId =
    typeof router.query.listId === "string" ? router.query.listId : null
  const [name, setName] = useState("")
  const [newListNameForExcel, setNewListNameForExcel] = useState("")
  const [activeFrom, setActiveFrom] = useState("")
  const [activeTo, setActiveTo] = useState("")
  const [isVisible, setIsVisible] = useState(true)

  const { data: lists = [], isLoading } = useShareholderLists(
    currentWorkspace?.id ?? null,
  )
  const createList = useCreateShareholderList()
  const updateList = useUpdateShareholderList()
  const base = currentWorkspace
    ? getWorkspaceAdminBase(currentWorkspace.id)
    : "/admin"

  const selectList = (id: string) => {
    router.replace(
      { pathname: `${base}/lists`, query: { listId: id } },
      undefined,
      { shallow: true },
    )
  }

  const handleCreateAndGoToExcel = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWorkspace?.id || !newListNameForExcel.trim()) return
    createList.mutate(
      {
        workspace_id: currentWorkspace.id,
        name: newListNameForExcel.trim(),
        active_from: null,
        active_to: null,
        is_visible: true,
      },
      {
        onSuccess: (data) => {
          setNewListNameForExcel("")
          router.push(`${base}/excel-import?listId=${data.id}`)
        },
      },
    )
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWorkspace?.id || !name.trim()) return
    createList.mutate(
      {
        workspace_id: currentWorkspace.id,
        name: name.trim(),
        active_from: activeFrom || null,
        active_to: activeTo || null,
        is_visible: isVisible,
      },
      {
        onSuccess: () => {
          setName("")
          setActiveFrom("")
          setActiveTo("")
        },
      },
    )
  }

  const toggleVisible = (list: ShareholderListRow) => {
    updateList.mutate({
      id: list.id,
      is_visible: !list.is_visible,
    })
  }

  if (!currentWorkspace) return null

  return (
    <>
      <PageTitle>주주명부 목록</PageTitle>

      <FormSection>
        <FormTitle>새 주주명부 만들기</FormTitle>
        <form onSubmit={handleCreate}>
          <FormRow>
            <Label>
              명부명 (상장사명 등)
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
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
            <Button
              type="submit"
              disabled={createList.isPending || !name.trim()}>
              생성
            </Button>
          </FormRow>
        </form>

        <FormTitle style={{ marginTop: "1.5rem" }}>
          엑셀으로 새 명부 만들기
        </FormTitle>
        <p
          style={{
            fontSize: "0.875rem",
            color: COLORS.gray[500],
            marginBottom: "0.75rem",
          }}>
          명부를 만든 뒤 엑셀 업로드 페이지로 이동합니다.
        </p>
        <form onSubmit={handleCreateAndGoToExcel}>
          <FormRow>
            <Label>
              명부명 (상장사명 등)
              <Input
                value={newListNameForExcel}
                onChange={(e) => setNewListNameForExcel(e.target.value)}
                placeholder={LIST_NAME_PLACEHOLDER}
              />
            </Label>
            <Button
              type="submit"
              disabled={createList.isPending || !newListNameForExcel.trim()}>
              명부 만들고 엑셀 업로드하기
            </Button>
          </FormRow>
        </form>
      </FormSection>

      <TableWrap>
        <Table>
          <thead>
            <Tr>
              <Th>명부명</Th>
              <Th>활성화 기간</Th>
              <Th>노출</Th>
              <Th>관리</Th>
            </Tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState>불러오는 중...</EmptyState>
                </td>
              </tr>
            ) : lists.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState>
                    주주명부가 없습니다. 위에서 새로 만드세요.
                  </EmptyState>
                </td>
              </tr>
            ) : (
              lists.map((list) => (
                <Tr key={list.id}>
                  <Td>{list.name}</Td>
                  <Td>
                    {list.active_from ?? "-"} ~ {list.active_to ?? "-"}
                  </Td>
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
                    <SelectListButton
                      type="button"
                      onClick={() => selectList(list.id)}>
                      주주 보기
                    </SelectListButton>
                    {" · "}
                    <LinkButton href={`${base}/excel-import?listId=${list.id}`}>
                      엑셀 업로드
                    </LinkButton>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      <ManagementSection>
        {listId ? (
          <>
            <ManagementHeader>
              <ManagementTitle>주주 관리</ManagementTitle>
              <ManagementActions>
                <LinkButton
                  href={{
                    pathname: `${base}/change-history`,
                    query: { listId },
                  }}>
                  변경 이력
                </LinkButton>
                <LinkButton href={`${base}/excel-import?listId=${listId}`}>
                  엑셀 업로드
                </LinkButton>
              </ManagementActions>
            </ManagementHeader>
            <ShareholderList listId={listId} />
          </>
        ) : (
          <EmptyManagement>
            위 표에서 명부의 &quot;주주 보기&quot;를 클릭하면 선택한 명부의 주주
            목록이 여기에 표시됩니다.
          </EmptyManagement>
        )}
      </ManagementSection>
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
