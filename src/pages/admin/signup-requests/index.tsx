import AdminLayout from "@/layouts/AdminLayout"
import { useCallback, useEffect, useState } from "react"
import styled from "@emotion/styled"
import { getAccessToken } from "@/lib/auth/clientAuth"
import { toast } from "react-toastify"
import GlobalSpinner from "@/components/ui/global-spinner"

type SignupRequest = {
  id: string
  email: string
  account_type: string
  workspace_name: string
  status: string
  created_at: string
}

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
`

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`

const SmallButton = styled.button<{ variant?: "primary" | "danger" }>`
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: ${(p) => (p.variant === "danger" ? "#dc2626" : "#1a73e8")};
  color: white;
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const Badge = styled.span<{ status: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${(p) =>
    p.status === "pending"
      ? "#fef3c7"
      : p.status === "approved"
        ? "#d1fae5"
        : "#fee2e2"};
  color: ${(p) =>
    p.status === "pending"
      ? "#92400e"
      : p.status === "approved"
        ? "#065f46"
        : "#991b1b"};
`

const EmptyState = styled.p`
  padding: 2rem;
  color: #6b7280;
  text-align: center;
`

const ErrorState = styled.p`
  padding: 2rem;
  color: #dc2626;
  text-align: center;
`

/** 가입 승인 본문. workspaceId 있으면 해당 워크스페이스 신청만, 없으면 통합(전체) 조회 */
export function SignupRequestsContent({
  workspaceId,
  noLayout = false,
}: {
  workspaceId: string | null
  noLayout?: boolean
}) {
  const [requests, setRequests] = useState<SignupRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) {
      setError("로그인이 필요합니다.")
      setLoading(false)

      return
    }
    const url = workspaceId
      ? `/api/admin/signup-requests?workspace_id=${encodeURIComponent(workspaceId)}`
      : "/api/admin/signup-requests"
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401 || res.status === 403) {
      setError(
        workspaceId
          ? "해당 워크스페이스의 가입 신청을 조회할 권한이 없습니다."
          : "서비스 관리자만 전체 목록을 조회할 수 있습니다.",
      )
      setLoading(false)

      return
    }
    if (!res.ok) {
      setError("목록을 불러오지 못했습니다.")
      setLoading(false)

      return
    }
    const data = await res.json()
    setRequests(Array.isArray(data) ? data : [])
    setError(null)
    setLoading(false)
  }, [workspaceId])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleAction = async (id: string, action: "approve" | "reject") => {
    const token = await getAccessToken()
    if (!token) return
    setActing(id)
    const res = await fetch(`/api/admin/signup-requests/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "처리에 실패했습니다.")
      setActing(null)

      return
    }
    toast.success(action === "approve" ? "승인했습니다." : "반려했습니다.")
    setActing(null)
    fetchRequests()
  }

  const accountTypeLabel = (v: string) =>
    v === "listed_company"
      ? "상장사"
      : v === "proxy_company"
        ? "의결권 대행사"
        : v

  const body = (
    <>
      <PageTitle>가입 승인</PageTitle>
      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "2rem",
          }}>
          <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
        </div>
      )}
      {error && <ErrorState>{error}</ErrorState>}
      {!loading && !error && (
        <TableWrap>
          <Table>
            <thead>
              <Tr>
                <Th>이메일</Th>
                <Th>유형</Th>
                <Th>사용자명</Th>
                <Th>상태</Th>
                <Th>신청일</Th>
                <Th>처리</Th>
              </Tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>대기 중인 가입 신청이 없습니다.</EmptyState>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <Tr key={r.id}>
                    <Td>{r.email}</Td>
                    <Td>{accountTypeLabel(r.account_type)}</Td>
                    <Td>{r.workspace_name || "-"}</Td>
                    <Td>
                      <Badge status={r.status}>
                        {r.status === "pending"
                          ? "대기"
                          : r.status === "approved"
                            ? "승인"
                            : "반려"}
                      </Badge>
                    </Td>
                    <Td>
                      {new Date(r.created_at).toLocaleDateString("ko-KR")}
                    </Td>
                    <Td>
                      {r.status === "pending" && (
                        <ButtonGroup>
                          <SmallButton
                            variant="primary"
                            disabled={acting === r.id}
                            onClick={() => handleAction(r.id, "approve")}>
                            승인
                          </SmallButton>
                          <SmallButton
                            variant="danger"
                            disabled={acting === r.id}
                            onClick={() => handleAction(r.id, "reject")}>
                            반려
                          </SmallButton>
                        </ButtonGroup>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </>
  )

  if (noLayout) return body

  return <AdminLayout>{body}</AdminLayout>
}

/** 통합 관리용 가입 승인 (서비스 관리자 전체 목록) */
export default function SignupRequestsPage() {
  return (
    <AdminLayout>
      <SignupRequestsContent workspaceId={null} noLayout />
    </AdminLayout>
  )
}
