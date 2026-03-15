import AdminLayout from "@/layouts/AdminLayout"
import { useRouter } from "next/router"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useCurrentWorkspace } from "@/store/workspaceState"
import styled from "@emotion/styled"
import supabase from "@/lib/supabase/supabaseClient"
import { COLORS } from "@/styles/global-style"
import { FIELD_LABELS } from "@/components/admin/shareholders/EditShareholderModal"
import GlobalSpinner from "@/components/ui/global-spinner"

type HistoryRow = {
  id: string
  shareholder_id: string
  changed_by: string
  changed_at: string
  field: string
  old_value: string | null
  new_value: string | null
}

type Data = {
  history: HistoryRow[]
  nameById: Record<string, string>
  changedByUser: Record<string, { name: string | null; email: string | null }>
}

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

const EmptyMessage = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${COLORS.gray[600]};
`

const ChangerLink = styled(Link)`
  color: ${COLORS.blue[600]};
  font-weight: 500;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

/** 변경 이력 본문 (listId 쿼리 사용) */
export function ChangeHistoryPageContent() {
  const router = useRouter()
  const listId =
    typeof router.query.listId === "string" ? router.query.listId : null
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!listId) {
      setLoading(false)
      setError("명부를 선택해 주세요.")

      return
    }
    const fetchHistory = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError("로그인이 필요합니다.")
        setLoading(false)

        return
      }
      const res = await fetch(`/api/workspace/lists/${listId}/change-history`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        setError("변경 이력을 불러오지 못했습니다.")
        setLoading(false)

        return
      }
      const json = await res.json()
      setData({
        history: json.history ?? [],
        nameById: json.nameById ?? {},
        changedByUser: json.changedByUser ?? {},
      })
      setError(null)
      setLoading(false)
    }
    fetchHistory()
  }, [listId])

  if (!listId) {
    return (
      <Container>
        <Header>
          <Title>변경 이력</Title>
        </Header>
        <EmptyMessage>
          주주명부 목록에서 &quot;주주 보기&quot; 후 변경 이력을 조회하거나,
          URL에 listId를 지정해 주세요.
        </EmptyMessage>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>변경 이력</Title>
      </Header>
      <TableWrapper>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem",
            }}>
            <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
          </div>
        ) : error ? (
          <EmptyMessage>{error}</EmptyMessage>
        ) : !data || data.history.length === 0 ? (
          <EmptyMessage>변경 이력이 없습니다.</EmptyMessage>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>일시</Th>
                <Th>주주</Th>
                <Th>필드</Th>
                <Th>변경 전</Th>
                <Th>변경 후</Th>
                <Th>변경자</Th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((row) => {
                const workspaceId =
                  typeof router.query.workspaceId === "string"
                    ? router.query.workspaceId
                    : null
                const userInfo = data.changedByUser[row.changed_by]
                const changerLabel =
                  userInfo?.name?.trim() ||
                  userInfo?.email?.trim() ||
                  row.changed_by
                const usersHref = workspaceId
                  ? `/workspaces/${workspaceId}/admin/users?userId=${row.changed_by}`
                  : null

                return (
                  <tr key={row.id}>
                    <Td>{row.changed_at}</Td>
                    <Td>
                      {data.nameById[row.shareholder_id] ?? row.shareholder_id}
                    </Td>
                    <Td>{FIELD_LABELS[row.field] ?? row.field}</Td>
                    <Td>{row.old_value ?? "-"}</Td>
                    <Td>{row.new_value ?? "-"}</Td>
                    <Td>
                      {usersHref ? (
                        <ChangerLink
                          href={usersHref}
                          title="사용자 관리에서 보기">
                          {changerLabel}
                        </ChangerLink>
                      ) : (
                        changerLabel
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </TableWrapper>
    </Container>
  )
}

export default function ChangeHistoryPage() {
  const router = useRouter()
  const [currentWorkspace] = useCurrentWorkspace()

  useEffect(() => {
    if (currentWorkspace && typeof window !== "undefined")
      router.replace({
        pathname: `/workspaces/${currentWorkspace.id}/admin/change-history`,
        query: router.query.listId ? { listId: router.query.listId } : {},
      })
  }, [currentWorkspace, router])

  if (currentWorkspace) return null

  return (
    <AdminLayout>
      <Container>
        <Header>
          <Title>변경 이력</Title>
        </Header>
        <EmptyMessage>워크스페이스를 선택해 주세요.</EmptyMessage>
      </Container>
    </AdminLayout>
  )
}
