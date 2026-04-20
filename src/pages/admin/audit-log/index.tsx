import AdminLayout from "@/layouts/AdminLayout"
import { useAdminStatus } from "@/api/auth"
import { getAccessToken } from "@/lib/auth/clientAuth"
import { apiClient, bearerHeaders, isHttpOk } from "@/lib/apiClient"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import GlobalSpinner from "@/components/ui/global-spinner"
import type { Json } from "@/types/db"

type AuditRow = {
  id: string
  created_at: string
  actor_user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: Json | null
}

const ForbiddenMessage = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${COLORS.gray[600]};
  a {
    color: ${COLORS.blue[600]};
    font-weight: 600;
  }
`

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.75rem;
  background: white;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
`

const Th = styled.th`
  text-align: left;
  padding: 0.65rem 0.75rem;
  background: ${COLORS.gray[50]};
  border-bottom: 1px solid ${COLORS.gray[200]};
  font-weight: 600;
  color: ${COLORS.gray[700]};
`

const Td = styled.td`
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid ${COLORS.gray[100]};
  vertical-align: top;
  color: ${COLORS.gray[800]};
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: ${COLORS.gray[900]};
`

const Hint = styled.p`
  font-size: 0.8125rem;
  color: ${COLORS.gray[600]};
  margin-bottom: 1rem;
  line-height: 1.5;
`

const JsonCell = styled.pre`
  margin: 0;
  font-size: 0.68rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 28rem;
`

async function fetchAuditLog(): Promise<AuditRow[]> {
  const token = await getAccessToken()
  if (!token) throw new Error("no_token")
  const res = await apiClient.get<AuditRow[]>("/api/admin/audit-log", {
    headers: bearerHeaders(token),
  })
  if (!isHttpOk(res.status)) {
    throw new Error("fetch_failed")
  }

  return Array.isArray(res.data) ? res.data : []
}

export default function AdminAuditLogPage() {
  const { data: adminStatus, isLoading: adminLoading } = useAdminStatus()
  const isServiceAdmin = adminStatus?.isServiceAdmin ?? false

  const q = useQuery({
    queryKey: ["platformAuditLog"],
    queryFn: fetchAuditLog,
    enabled: isServiceAdmin,
  })

  if (!adminLoading && !isServiceAdmin) {
    return (
      <AdminLayout>
        <ForbiddenMessage>
          플랫폼 감사 로그는 서비스 관리자만 볼 수 있습니다.{" "}
          <Link href="/admin/integrated">통합 관리로</Link>
        </ForbiddenMessage>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Title>플랫폼 감사 로그</Title>
      <Hint>
        가입 승인/철회, 워크스페이스 삭제, 관리자 계정 삭제 등 주요 조치가
        기록됩니다. (주주 데이터 변경은 별도 `shareholder_change_history` 등을
        참고하세요.)
      </Hint>
      {q.isPending ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
        </div>
      ) : q.isError ? (
        <p style={{ color: COLORS.red[600] }}>목록을 불러오지 못했습니다.</p>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>시각</Th>
                <Th>작업</Th>
                <Th>대상</Th>
                <Th>비고</Th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).length === 0 ? (
                <tr>
                  <Td colSpan={4}>기록이 없습니다.</Td>
                </tr>
              ) : (
                (q.data ?? []).map((row) => (
                  <tr key={row.id}>
                    <Td>{new Date(row.created_at).toLocaleString("ko-KR")}</Td>
                    <Td>{row.action}</Td>
                    <Td>
                      {row.resource_type}
                      {row.resource_id ? ` · ${row.resource_id}` : ""}
                    </Td>
                    <Td>
                      {row.details ? (
                        <JsonCell>
                          {JSON.stringify(row.details, null, 0)}
                        </JsonCell>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </AdminLayout>
  )
}
