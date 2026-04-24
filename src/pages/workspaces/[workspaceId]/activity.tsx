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
import { useMediaQuery } from "@/hooks/useMediaQuery"
import FieldAgentAgreementGate from "@/components/workspace/FieldAgentAgreementGate"

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

const MobileCardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const ActivityCard = styled.article`
  background: white;
  border-radius: 0.75rem;
  padding: 0.9rem 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
`

const CardBlock = styled.div`
  margin-bottom: 0.65rem;
  &:last-of-type {
    margin-bottom: 0;
  }
`

const CardLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 700;
  color: ${COLORS.gray[500]};
  margin-bottom: 0.2rem;
  letter-spacing: 0.02em;
`

const CardValue = styled.div`
  font-size: 0.84rem;
  color: ${COLORS.gray[900]};
  line-height: 1.45;
  word-break: break-word;
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${COLORS.gray[900]};
  margin: 0 0 0.5rem;
`

const NavRow = styled.p`
  margin: 0 0 1rem;
  font-size: 0.9375rem;
  a {
    color: ${COLORS.blue[600]};
    font-weight: 700;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`

const SubNav = styled.p`
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: ${COLORS.gray[600]};
  a {
    color: ${COLORS.blue[600]};
    font-weight: 600;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
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
  const isMobileLayout = useMediaQuery("(max-width: 768px)")
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
      <FieldAgentAgreementGate
        workspaceId={typeof workspaceId === "string" ? workspaceId : null}
      />
      <Title>활동 기록</Title>
      <NavRow>
        <Link href={`/workspaces/${workspaceId}`}>지도로 돌아가기</Link>
      </NavRow>
      <SubNav>
        <Link href={ROUTES.workspaces}>상장사 목록</Link>
        {" · "}
        <Link href={`/workspaces/${workspaceId}/photo-drop-inbox`}>
          공개 접수함
        </Link>
      </SubNav>
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
      ) : isMobileLayout ? (
        <MobileCardList aria-label="변경 이력">
          {sorted.slice(0, 500).map((h) => (
            <ActivityCard key={h.id}>
              <CardBlock>
                <CardLabel>일시</CardLabel>
                <CardValue>{formatDateTimeKo(h.changed_at)}</CardValue>
              </CardBlock>
              <CardBlock>
                <CardLabel>주주</CardLabel>
                <CardValue>
                  {historyQuery.data?.nameById?.[h.shareholder_id] ??
                    h.shareholder_id}
                </CardValue>
              </CardBlock>
              <CardBlock>
                <CardLabel>필드</CardLabel>
                <CardValue>{h.field}</CardValue>
              </CardBlock>
              <CardBlock>
                <CardLabel>변경</CardLabel>
                <CardValue>{`${h.old_value ?? "—"} → ${h.new_value ?? "—"}`}</CardValue>
              </CardBlock>
            </ActivityCard>
          ))}
        </MobileCardList>
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
