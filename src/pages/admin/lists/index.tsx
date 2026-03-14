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

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
`

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid #e5e7eb;
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
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
`

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
`

const Tr = styled.tr`
  &:last-child td {
    border-bottom: none;
  }
`

const FormSection = styled.section`
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
`

const FormTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
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
  color: #374151;
`

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
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
`

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    background: #1557b0;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const LinkButton = styled(Link)`
  padding: 0.375rem 0.75rem;
  background: #f3f4f6;
  color: #374151;
  border-radius: 6px;
  font-size: 0.8125rem;
  text-decoration: none;
  &:hover {
    background: #e5e7eb;
  }
`

const EmptyState = styled.p`
  padding: 2rem;
  color: #6b7280;
  text-align: center;
`

/** 워크스페이스 주주명부 목록 본문 (workspace 설정된 상태에서 사용) */
export function ListsPageContent() {
  const [currentWorkspace] = useCurrentWorkspace()
  const [name, setName] = useState("")
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

  const toggleVisible = (list: {
    id: string
    workspace_id: string
    is_visible: boolean
  }) => {
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
                placeholder="예: OO상장사"
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
                    <LinkButton href={`${base}/shareholders?listId=${list.id}`}>
                      주주 보기
                    </LinkButton>
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
