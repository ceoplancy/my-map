import Link from "next/link"
import { useGetUserData } from "@/api/auth"
import { FullPageLoader } from "@/components/FullPageLoader"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { toast } from "react-toastify"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { useCurrentWorkspace } from "@/store/workspaceState"
import { getWorkspaceAdminBase } from "@/lib/utils"
import {
  useShareholderLists,
  useShareholders,
  useWorkspaceMembersWithUsers,
} from "@/api/workspace"
import * as XLSX from "xlsx"
import { type Tables, type WorkspaceRole } from "@/types/db"
import { WORKSPACE_ROLE_LABELS } from "@/constants/roles"
import Select from "@/components/ui/select"

const WelcomeSection = styled.div`
  background: linear-gradient(135deg, white, #f8fafc);
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 2rem;
  margin-bottom: 2rem;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`

const WelcomeTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1f2937, #4b5563);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.75rem;
`

const WelcomeText = styled.p`
  color: #4b5563;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 2rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const StatCard = styled.div<{ variant: "blue" | "green" | "purple" }>`
  background: ${(props) => {
    switch (props.variant) {
      case "blue":
        return `linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]})`
      case "green":
        return `linear-gradient(135deg, ${COLORS.green[500]}, ${COLORS.green[600]})`
      case "purple":
        return `linear-gradient(135deg, ${COLORS.purple[500]}, ${COLORS.purple[600]})`
      default:
        return `linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]})`
    }
  }};
  color: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
`

const StatTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`

const StatValue = styled.p`
  font-size: 1.875rem;
  font-weight: 700;
`

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const ContentCard = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;

  &:hover {
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`

const CardTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
`

const ViewAllLink = styled(Link)`
  color: ${COLORS.blue[500]};
  font-size: 0.875rem;
  &:hover {
    color: ${COLORS.blue[600]};
  }
`

const UserItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  transition: all 0.2s ease;
  border-radius: 0.75rem;

  &:hover {
    background-color: #f8fafc;
    transform: translateX(4px);
  }
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const UserAvatar = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #e5e7eb, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`

const UserEmail = styled.p`
  font-weight: 500;
  color: #1f2937;
`

const UserDate = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
`

const UserRole = styled.span<{ isAdmin: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  background: ${(props) =>
    props.isAdmin
      ? "linear-gradient(135deg, #ddd6fe, #c4b5fd)"
      : "linear-gradient(135deg, #f3f4f6, #e5e7eb)"};
  color: ${(props) => (props.isAdmin ? "#6d28d9" : "#374151")};
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`

const ActionButton = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f9fafb, #f3f4f6);
  border-radius: 1rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
`

const ActionIcon = styled.svg`
  width: 2rem;
  height: 2rem;
  color: #4b5563;
  margin-bottom: 0.5rem;
`

const ActionText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`

const SettingsButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f3f4f6;
  }
`

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const UserAvatarText = styled.span`
  color: #4b5563; // text-gray-600
  font-weight: 500; // font-medium
`

const ListDashboardSection = styled.div`
  margin-bottom: 2rem;
`

const ListSelectRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`

const ListSelectLabel = styled.label`
  font-weight: 600;
  color: ${COLORS.gray[700]};
`

const ListSelect = styled(Select)`
  min-width: 200px;
`

const StatusCountGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
`

const StatusCountCard = styled.div<{ color: string }>`
  padding: 1rem;
  border-radius: 0.75rem;
  background: ${(p) => p.color};
  color: white;
  text-align: center;
`

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1rem;
`

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const FilterInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  min-width: 120px;
`

const ExportButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${COLORS.green[500]};
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${COLORS.green[600]};
  }
`

const STATUS_OPTIONS = ["미방문", "보류", "완료", "실패"] as const

/** 워크스페이스 대시보드 본문 (useCurrentWorkspace 기준). /admin 또는 /workspaces/[id]/admin 에서 사용 */
export function WorkspaceDashboardBody() {
  const { data: user } = useGetUserData()
  const [workspace] = useCurrentWorkspace()
  const { data: workspaceMembersWithUsers = [] } = useWorkspaceMembersWithUsers(
    workspace?.id ?? null,
  )
  const { data: lists = [] } = useShareholderLists(workspace?.id ?? null)
  const [selectedListId, setSelectedListId] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterCompany, setFilterCompany] = useState("")
  const [filterMaker, setFilterMaker] = useState("")

  const effectiveListId = (selectedListId || lists[0]?.id) ?? null
  const { data: shareholders = [] } = useShareholders({
    listId: effectiveListId,
    status: filterStatus.length > 0 ? filterStatus : undefined,
    company: filterCompany.trim() ? [filterCompany.trim()] : undefined,
    maker: filterMaker.trim() || undefined,
  })

  const { byStatus, totalStocks } = useMemo(() => {
    const byStatus: Record<string, number> = {
      미방문: 0,
      보류: 0,
      완료: 0,
      실패: 0,
    }
    let totalStocks = 0
    for (const s of shareholders as Tables<"shareholders">[]) {
      const status = s.status ?? "미방문"
      if (status in byStatus) byStatus[status]++
      totalStocks += s.stocks ?? 0
    }

    return { byStatus, totalStocks }
  }, [shareholders])

  const handleExportExcel = () => {
    if (shareholders.length === 0) {
      toast.info("내보낼 데이터가 없습니다.")

      return
    }
    const rows = (shareholders as Tables<"shareholders">[]).map((s) => ({
      이름: s.name ?? "",
      상태: s.status ?? "",
      주식수: s.stocks ?? 0,
      주소: s.address ?? "",
      회사: s.company ?? "",
      담당: s.maker ?? "",
      메모: s.memo ?? "",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "주주목록")
    XLSX.writeFile(wb, "주주목록.xlsx")
    toast.success("엑셀 파일이 다운로드되었습니다.")
  }

  // /admin 은 워크스페이스 전용 대시보드. 통합(플랫폼) 현황은 /admin/integrated
  const memberCount = workspaceMembersWithUsers.length
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const newMembersThisMonth = workspaceMembersWithUsers.filter((m) => {
    const d = new Date(m.created_at)

    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }).length
  const adminRoleCount = workspaceMembersWithUsers.filter((m) =>
    ["service_admin", "top_admin", "admin"].includes(m.role),
  ).length
  const recentMembers = [...workspaceMembersWithUsers]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5)

  if (!workspace) return null

  const workspaceAdminBase = getWorkspaceAdminBase(workspace.id)

  return (
    <>
      <WelcomeSection>
        <WelcomeTitle>
          안녕하세요,{" "}
          {user?.user.user_metadata.name
            ? user?.user.user_metadata.name
            : user?.user.email}
          님 👋
        </WelcomeTitle>
        <WelcomeText>
          이 워크스페이스의 현황을 확인하고 주주명부·멤버를 관리할 수 있습니다.
        </WelcomeText>
      </WelcomeSection>

      {lists.length > 0 && (
        <ListDashboardSection>
          <ContentCard>
            <CardHeader>
              <CardTitle>주주명부 현황</CardTitle>
            </CardHeader>
            <ListSelectRow>
              <ListSelectLabel>명부 선택</ListSelectLabel>
              <ListSelect
                value={effectiveListId ?? ""}
                onChange={(e) => setSelectedListId(e.target.value)}>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </ListSelect>
            </ListSelectRow>
            <StatusCountGrid>
              <StatusCountCard color={COLORS.gray[500]}>
                <div>미방문</div>
                <div>{byStatus["미방문"] ?? 0}</div>
              </StatusCountCard>
              <StatusCountCard color={COLORS.yellow[500]}>
                <div>보류</div>
                <div>{byStatus["보류"] ?? 0}</div>
              </StatusCountCard>
              <StatusCountCard color={COLORS.green[500]}>
                <div>완료</div>
                <div>{byStatus["완료"] ?? 0}</div>
              </StatusCountCard>
              <StatusCountCard color={COLORS.red[500]}>
                <div>실패</div>
                <div>{byStatus["실패"] ?? 0}</div>
              </StatusCountCard>
              <StatusCountCard color={COLORS.blue[500]}>
                <div>주식 수</div>
                <div>{totalStocks.toLocaleString()}</div>
              </StatusCountCard>
            </StatusCountGrid>
            <FilterRow>
              <FilterGroup>
                <ListSelectLabel>상태</ListSelectLabel>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {STATUS_OPTIONS.map((st) => (
                    <label key={st}>
                      <input
                        type="checkbox"
                        checked={filterStatus.includes(st)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterStatus((prev) => [...prev, st])
                          } else {
                            setFilterStatus((prev) =>
                              prev.filter((x) => x !== st),
                            )
                          }
                        }}
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </FilterGroup>
              <FilterGroup>
                <ListSelectLabel>소속(회사)</ListSelectLabel>
                <FilterInput
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  placeholder="회사명"
                />
              </FilterGroup>
              <FilterGroup>
                <ListSelectLabel>담당</ListSelectLabel>
                <FilterInput
                  value={filterMaker}
                  onChange={(e) => setFilterMaker(e.target.value)}
                  placeholder="담당자"
                />
              </FilterGroup>
              <ExportButton onClick={handleExportExcel}>
                엑셀 내보내기 ({shareholders.length}건)
              </ExportButton>
            </FilterRow>
          </ContentCard>
        </ListDashboardSection>
      )}

      <StatsGrid>
        <StatCard variant="blue">
          <StatTitle>워크스페이스 멤버</StatTitle>
          <StatValue>{memberCount}</StatValue>
        </StatCard>

        <StatCard variant="green">
          <StatTitle>이번 달 추가된 멤버</StatTitle>
          <StatValue>{newMembersThisMonth}</StatValue>
        </StatCard>

        <StatCard variant="purple">
          <StatTitle>관리자 수</StatTitle>
          <StatValue>{adminRoleCount}</StatValue>
        </StatCard>
      </StatsGrid>

      {/* 최근 활동 섹션 */}
      <ContentGrid>
        <ContentCard>
          <CardHeader>
            <CardTitle>최근 추가된 멤버</CardTitle>
            <ViewAllLink href={`${workspaceAdminBase}/users`}>
              전체 보기 →
            </ViewAllLink>
          </CardHeader>
          <UserList>
            {recentMembers.length === 0 ? (
              <UserItem>
                <UserDetails>
                  <UserEmail style={{ color: COLORS.gray[500] }}>
                    멤버가 없습니다.
                  </UserEmail>
                </UserDetails>
              </UserItem>
            ) : (
              recentMembers.map((m) => {
                const displayName =
                  m.name?.trim() || m.email?.trim() || m.user_id
                const initial = m.email?.[0] ?? m.user_id.slice(0, 2)

                return (
                  <UserItem key={m.id}>
                    <UserInfo>
                      <UserAvatar>
                        <UserAvatarText>
                          {String(initial).toUpperCase()}
                        </UserAvatarText>
                      </UserAvatar>
                      <UserDetails>
                        <UserEmail>{displayName}</UserEmail>
                        <UserDate>
                          추가일: {new Date(m.created_at).toLocaleDateString()}
                        </UserDate>
                      </UserDetails>
                    </UserInfo>
                    <UserRole isAdmin={m.role !== "field_agent"}>
                      {WORKSPACE_ROLE_LABELS[m.role as WorkspaceRole]}
                    </UserRole>
                  </UserItem>
                )
              })
            )}
          </UserList>
        </ContentCard>

        {/* 빠른 작업 */}
        <ContentCard>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
          </CardHeader>
          <QuickActions>
            <ActionButton href={`${workspaceAdminBase}/users`}>
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </ActionIcon>
              <ActionText>사용자 관리</ActionText>
            </ActionButton>

            <ActionButton href={`${workspaceAdminBase}/shareholders`}>
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </ActionIcon>
              <ActionText>주주명부 관리</ActionText>
            </ActionButton>

            <ActionButton href={`${workspaceAdminBase}/excel-import`}>
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </ActionIcon>
              <ActionText>엑셀 업로드</ActionText>
            </ActionButton>

            <SettingsButton onClick={() => toast.info("준비 중인 기능입니다.")}>
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </ActionIcon>
              <ActionText>시스템 설정</ActionText>
            </SettingsButton>
          </QuickActions>
        </ContentCard>
      </ContentGrid>
    </>
  )
}

/** /admin 접근 시 통합 관리 대시보드로 리다이렉트 */
export default function AdminDashboard() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined") router.replace("/admin/integrated")
  }, [router])

  return <FullPageLoader message="이동 중..." />
}
