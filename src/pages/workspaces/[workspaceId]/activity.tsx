import { useRouter } from "next/router"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import styled from "@emotion/styled"

import { useSession } from "@/api/auth"
import { getAccessToken } from "@/lib/auth/clientAuth"
import { fetchWorkspaceListChangeHistory } from "@/api/nextApi"
import { COLORS } from "@/styles/global-style"
import GlobalSpinner from "@/components/ui/global-spinner"
import { formatDateTimeKo } from "@/lib/formatDateTimeKo"
import supabase from "@/lib/supabase/supabaseClient"
import { ROUTES } from "@/constants/routes"

const Page = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  box-sizing: border-box;
  padding: max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    max(1.25rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  max-width: 960px;
  margin: 0 auto;
  background: ${COLORS.background.light};
`

const TableScroll = styled.div`
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${COLORS.gray[900]};
  margin-bottom: 1rem;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
`

const Th = styled.th`
  text-align: left;
  padding: 0.65rem 0.75rem;
  font-size: 0.8rem;
  color: ${COLORS.gray[600]};
  background: ${COLORS.gray[50]};
`

const Td = styled.td`
  padding: 0.55rem 0.75rem;
  font-size: 0.8rem;
  border-top: 1px solid ${COLORS.gray[100]};
  vertical-align: top;
`

const Select = styled.select`
  margin-bottom: 1rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid ${COLORS.gray[200]};
`

export default function WorkspaceActivityPage() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId?: string }
  const { data: session } = useSession()
  const [listId, setListId] = useState<string>("")

  const listsQuery = useQuery({
    queryKey: ["shareholderListsForActivity", workspaceId],
    enabled: !!workspaceId && !!session?.user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shareholder_lists")
        .select("id, name")
        .eq("workspace_id", workspaceId as string)
        .order("created_at", { ascending: false })
      if (error) throw error

      return data ?? []
    },
  })

  const token = session?.access_token

  const historyQuery = useQuery({
    queryKey: ["workspaceActivityHistory", listId, token],
    enabled: !!listId && !!token,
    queryFn: async () => {
      const tok = await getAccessToken()
      if (!tok) throw new Error("no_token")

      return fetchWorkspaceListChangeHistory(tok, listId)
    },
  })

  const sorted = useMemo(() => {
    const rows = historyQuery.data?.history ?? []

    return [...rows].sort((a, b) => b.changed_at.localeCompare(a.changed_at))
  }, [historyQuery.data?.history])

  const listsData = listsQuery.data

  useEffect(() => {
    const lists = listsData ?? []
    if (lists.length > 0 && !listId) setListId(lists[0].id)
  }, [listsData, listId])
  if (listsQuery.isPending) {
    return (
      <Page>
        <GlobalSpinner width={26} height={26} dotColor="#8536FF" />
      </Page>
    )
  }

  if (!workspaceId) {
    return null
  }

  return (
    <Page>
      <Title>활동 기록</Title>
      <p style={{ marginBottom: "1rem" }}>
        <Link href={ROUTES.workspaces} style={{ color: COLORS.blue[600] }}>
          워크스페이스 목록
        </Link>{" "}
        ·{" "}
        <Link
          href={`/workspaces/${workspaceId}`}
          style={{ color: COLORS.blue[600] }}>
          지도로
        </Link>
      </p>
      <div>
        <label htmlFor="act-list" style={{ marginRight: 8 }}>
          명부
        </label>
        <Select
          id="act-list"
          value={listId}
          onChange={(e) => setListId(e.target.value)}>
          {(listsData ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>
      {historyQuery.isPending ? (
        <GlobalSpinner width={22} height={22} dotColor="#8536FF" />
      ) : historyQuery.isError ? (
        <p style={{ color: COLORS.red[600] }}>이력을 불러오지 못했습니다.</p>
      ) : (
        <TableScroll>
          <Table>
            <thead>
              <tr>
                <Th>일시</Th>
                <Th>주주</Th>
                <Th>필드</Th>
                <Th>변경</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 500).map((h) => (
                <tr key={h.id}>
                  <Td>{formatDateTimeKo(h.changed_at)}</Td>
                  <Td>
                    {historyQuery.data?.nameById?.[h.shareholder_id] ??
                      h.shareholder_id}
                  </Td>
                  <Td>{h.field}</Td>
                  <Td>{`${h.old_value ?? "—"} → ${h.new_value ?? "—"}`}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
    </Page>
  )
}
