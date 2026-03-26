import AdminLayout from "@/layouts/AdminLayout"
import { useRouter } from "next/router"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useCurrentWorkspace } from "@/store/workspaceState"
import styled from "@emotion/styled"
import { getAccessToken } from "@/lib/auth/clientAuth"
import supabase from "@/lib/supabase/supabaseClient"
import { COLORS } from "@/styles/global-style"
import EditShareholderModal, {
  FIELD_LABELS,
} from "@/components/admin/shareholders/EditShareholderModal"
import GlobalSpinner from "@/components/ui/global-spinner"
import { formatDateTimeKo } from "@/lib/formatDateTimeKo"
import { useSession } from "@/api/auth"
import type { Tables } from "@/types/db"
import { toast } from "react-toastify"

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
  total: number
  truncated?: boolean
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
  min-width: 56rem;
  border-collapse: collapse;
  table-layout: auto;
`

const Th = styled.th`
  padding: 1rem 1.25rem;
  text-align: left;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const Td = styled.td`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${COLORS.gray[100]};
  font-size: 0.875rem;
  color: ${COLORS.gray[700]};
  vertical-align: top;
`

/** 일시 — 포맷된 문자열 한 줄 */
const ThColDate = styled(Th)`
  white-space: nowrap;
  min-width: 11rem;
  width: 1%;
`

const TdColDate = styled(Td)`
  white-space: nowrap;
  min-width: 11rem;
  width: 1%;
`

/** 주주 */
const ThColShareholder = styled(Th)`
  min-width: 12rem;
  max-width: 18rem;
`

const TdColShareholder = styled(Td)`
  min-width: 12rem;
  max-width: 18rem;
  word-break: break-word;
`

/** 필드명 — 짧은 라벨이 줄바꿈되지 않도록 */
const ThColField = styled(Th)`
  white-space: nowrap;
  min-width: 6.5rem;
  width: 1%;
`

const TdColField = styled(Td)`
  white-space: nowrap;
  min-width: 6.5rem;
  width: 1%;
`

/** 변경 전·후 — 긴 본문은 이 열 안에서만 줄바꿈 */
const ThColBody = styled(Th)`
  min-width: 12rem;
  max-width: 22rem;
  word-break: break-word;
`

const TdColBody = styled(Td)`
  min-width: 12rem;
  max-width: 22rem;
  word-break: break-word;
  overflow-wrap: anywhere;
`

/** 변경자 — 이름 한 줄 */
const ThColChanger = styled(Th)`
  white-space: nowrap;
  min-width: 8rem;
  width: 1%;
`

const TdColChanger = styled(Td)`
  white-space: nowrap;
  min-width: 8rem;
  width: 1%;
`

const EmptyMessage = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${COLORS.gray[600]};
`

const SummaryBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem 1rem;
`

const SummaryText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${COLORS.gray[600]};
`

const SearchInput = styled.input`
  min-width: 220px;
  max-width: 360px;
  flex: 1;
  padding: 0.6rem 0.9rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  }
`

const TruncationNote = styled.div`
  padding: 0.75rem 1.5rem;
  background: ${COLORS.gray[50]};
  color: ${COLORS.gray[700]};
  font-size: 0.8125rem;
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const TotalNote = styled.div`
  padding: 0.75rem 1.5rem;
  color: ${COLORS.gray[600]};
  font-size: 0.875rem;
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const ChangerLink = styled(Link)`
  display: inline-block;
  color: ${COLORS.blue[600]};
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  &:hover {
    text-decoration: underline;
  }
`

const ShareholderOpenButton = styled.button`
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: ${COLORS.blue[600]};
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: ${COLORS.blue[700]};
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.blue[500]};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const ModalLoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
`

/** 변경 이력 본문 (listId 쿼리 사용) */
export function ChangeHistoryPageContent() {
  const router = useRouter()
  const { data: session } = useSession()
  const listId =
    router.isReady && typeof router.query.listId === "string"
      ? router.query.listId
      : null
  const [shareholderIdForModal, setShareholderIdForModal] = useState<
    string | null
  >(null)
  const [search, setSearch] = useState("")

  const {
    data: historyPayload,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["workspaceListChangeHistory", listId],
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("LOGIN_REQUIRED")
      }
      const res = await fetch(`/api/workspace/lists/${listId}/change-history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error("FETCH_FAILED")
      }

      return res.json() as Promise<{
        history?: HistoryRow[]
        total?: number
        truncated?: boolean
        nameById?: Record<string, string>
        changedByUser?: Record<
          string,
          { name: string | null; email: string | null }
        >
      }>
    },
    enabled: Boolean(listId) && router.isReady,
  })

  const data: Data | null = useMemo(() => {
    if (!historyPayload) return null

    return {
      history: historyPayload.history ?? [],
      total:
        typeof historyPayload.total === "number"
          ? historyPayload.total
          : (historyPayload.history?.length ?? 0),
      truncated: Boolean(historyPayload.truncated),
      nameById: historyPayload.nameById ?? {},
      changedByUser: historyPayload.changedByUser ?? {},
    }
  }, [historyPayload])

  const errorMessage = useMemo(() => {
    if (!isHistoryError || !historyError) return null
    const msg =
      historyError instanceof Error
        ? historyError.message
        : String(historyError)
    if (msg === "LOGIN_REQUIRED") return "로그인이 필요합니다."

    return "변경 이력을 불러오지 못했습니다."
  }, [isHistoryError, historyError])

  const loading = Boolean(listId) && router.isReady && isHistoryLoading

  const {
    data: modalShareholder,
    isPending: modalLoading,
    isError: modalFetchError,
  } = useQuery({
    queryKey: ["shareholderRowForModal", shareholderIdForModal],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from("shareholders")
        .select("*")
        .eq("id", shareholderIdForModal!)
        .single()
      if (error) throw error

      return row as Tables<"shareholders">
    },
    enabled: Boolean(shareholderIdForModal),
    retry: false,
  })

  useEffect(() => {
    if (!modalFetchError || !shareholderIdForModal) return
    toast.error("주주 정보를 불러오지 못했습니다.")
    setShareholderIdForModal(null)
  }, [modalFetchError, shareholderIdForModal])

  const filteredHistory = useMemo(() => {
    if (!data?.history?.length) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.history

    return data.history.filter((row) => {
      const shareholderLabel =
        data.nameById[row.shareholder_id] ?? row.shareholder_id
      const userInfo = data.changedByUser[row.changed_by]
      const changerLabel =
        userInfo?.name?.trim() || userInfo?.email?.trim() || row.changed_by
      const fieldLabel = FIELD_LABELS[row.field] ?? row.field

      const haystack = [
        shareholderLabel,
        row.field,
        fieldLabel,
        row.old_value ?? "",
        row.new_value ?? "",
        changerLabel,
        row.changed_at,
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [data, search])

  if (!router.isReady) {
    return (
      <Container>
        <Header>
          <Title>변경 이력</Title>
        </Header>
        <TableWrapper>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem",
            }}>
            <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
          </div>
        </TableWrapper>
      </Container>
    )
  }

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
        ) : errorMessage ? (
          <EmptyMessage>{errorMessage}</EmptyMessage>
        ) : !data || data.history.length === 0 ? (
          <EmptyMessage>
            이 명부에 기록된 변경 이력이 없습니다. 주주 정보를 수정하면 여기에
            표시됩니다. (파일 일괄 반영 등은 이력에 남지 않을 수 있습니다.)
          </EmptyMessage>
        ) : (
          <>
            {data.truncated ? (
              <TruncationNote>
                전체 {data.total.toLocaleString()}건 중 최신{" "}
                {data.history.length.toLocaleString()}건만 불러왔습니다. 더
                오래된 이력은 DB에서 확인하세요.
              </TruncationNote>
            ) : (
              <TotalNote>
                명부 전체 변경 이력{" "}
                <strong>{data.total.toLocaleString()}건</strong>
              </TotalNote>
            )}
            <SummaryBar>
              <SummaryText>
                표시{" "}
                <strong>
                  {search.trim()
                    ? `${filteredHistory.length.toLocaleString()}건`
                    : `${data.history.length.toLocaleString()}건`}
                </strong>
                {search.trim() ? (
                  <>
                    {" "}
                    (검색 결과 / 불러온 {data.history.length.toLocaleString()}
                    건)
                  </>
                ) : null}
              </SummaryText>
              <SearchInput
                type="search"
                placeholder="주주명, 회사, 필드, 변경 내용, 변경자로 검색…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="변경 이력 검색"
              />
            </SummaryBar>
            {filteredHistory.length === 0 ? (
              <EmptyMessage>검색 조건에 맞는 이력이 없습니다.</EmptyMessage>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <ThColDate>일시</ThColDate>
                    <ThColShareholder>주주</ThColShareholder>
                    <ThColField>필드</ThColField>
                    <ThColBody>변경 전</ThColBody>
                    <ThColBody>변경 후</ThColBody>
                    <ThColChanger>변경자</ThColChanger>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row) => {
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
                        <TdColDate>
                          {formatDateTimeKo(row.changed_at)}
                        </TdColDate>
                        <TdColShareholder>
                          <ShareholderOpenButton
                            type="button"
                            title="주주 정보 편집"
                            onClick={() =>
                              setShareholderIdForModal(row.shareholder_id)
                            }>
                            {data.nameById[row.shareholder_id] ??
                              row.shareholder_id}
                          </ShareholderOpenButton>
                        </TdColShareholder>
                        <TdColField>
                          {FIELD_LABELS[row.field] ?? row.field}
                        </TdColField>
                        <TdColBody>{row.old_value ?? "-"}</TdColBody>
                        <TdColBody>{row.new_value ?? "-"}</TdColBody>
                        <TdColChanger>
                          {usersHref ? (
                            <ChangerLink
                              href={usersHref}
                              title="사용자 관리에서 보기">
                              {changerLabel}
                            </ChangerLink>
                          ) : (
                            changerLabel
                          )}
                        </TdColChanger>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </>
        )}
      </TableWrapper>
      {shareholderIdForModal && modalLoading ? (
        <ModalLoadingOverlay>
          <GlobalSpinner width={32} height={32} dotColor="#8536FF" />
        </ModalLoadingOverlay>
      ) : null}
      {shareholderIdForModal && modalShareholder && session?.user?.id ? (
        <EditShareholderModal
          data={modalShareholder}
          userId={session.user.id}
          onClose={() => {
            setShareholderIdForModal(null)
            void refetchHistory()
          }}
        />
      ) : null}
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
