import AdminLayout from "@/layouts/AdminLayout"
import { FullPageLoader } from "@/components/FullPageLoader"
import { useGetUsers, useAdminWorkspaces } from "@/api/supabase"
import Link from "next/link"
import { useRouter } from "next/router"
import { useAdminStatus, useGetUserData } from "@/api/auth"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"

const WelcomeSection = styled.div`
  background: linear-gradient(135deg, white, #f8fafc);
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 2rem;
  margin-bottom: 2rem;
`

const WelcomeTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 0.75rem;
`

const WelcomeText = styled.p`
  color: #4b5563;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

const StatCard = styled.div<{ variant: "blue" | "green" | "purple" | "slate" }>`
  background: ${(props) => {
    switch (props.variant) {
      case "blue":
        return `linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]})`
      case "green":
        return `linear-gradient(135deg, ${COLORS.green[500]}, ${COLORS.green[600]})`
      case "purple":
        return `linear-gradient(135deg, ${COLORS.purple[500]}, ${COLORS.purple[600]})`
      case "slate":
        return `linear-gradient(135deg, #475569, #334155)`
      default:
        return `linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]})`
    }
  }};
  color: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`

const StatTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  opacity: 0.95;
`

const StatValue = styled.p`
  font-size: 1.5rem;
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
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const UserItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  &:hover {
    background-color: #f8fafc;
  }
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const UserAvatar = styled.div`
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
`

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`

const UserEmail = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
`

const UserDate = styled.span`
  font-size: 0.75rem;
  color: #64748b;
`

const UserRole = styled.span<{ isAdmin?: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background: ${(p) => (p.isAdmin ? COLORS.purple[100] : COLORS.gray[100])};
  color: ${(p) => (p.isAdmin ? COLORS.purple[700] : COLORS.gray[700])};
`

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
`

const ActionButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background: #f8fafc;
  color: #334155;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s;
  &:hover {
    background: #e2e8f0;
  }
`

const ActionIcon = styled.svg`
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
`

const ActionText = styled.span`
  font-size: 0.875rem;
`

/** 통합 대시보드: 서비스 최고 관리자 전용, 워크스페이스 무관 플랫폼 전체 현황 */
export default function IntegratedDashboardPage() {
  const router = useRouter()
  const { data: user } = useGetUserData()
  const { data: adminStatus, isLoading: adminStatusLoading } = useAdminStatus()
  const isServiceAdmin = adminStatus?.isServiceAdmin ?? false
  const { data: users } = useGetUsers(1, 100)
  const { data: workspaces = [] } = useAdminWorkspaces()

  if (adminStatusLoading) {
    return (
      <AdminLayout>
        <FullPageLoader message="통합 관리 대시보드를 불러오는 중..." />
      </AdminLayout>
    )
  }

  if (!isServiceAdmin) {
    if (typeof window !== "undefined") {
      router.replace("/admin")
    }

    return (
      <AdminLayout>
        <FullPageLoader message="이동 중..." />
      </AdminLayout>
    )
  }

  const userList = users?.users ?? []
  const totalUsers = users?.metadata?.totalCount ?? userList.length
  const now = new Date()
  const newThisMonth = userList.filter(
    (u) =>
      new Date(u.created_at).getMonth() === now.getMonth() &&
      new Date(u.created_at).getFullYear() === now.getFullYear(),
  ).length
  const adminCount = userList.filter((u) =>
    String(u.user_metadata?.role).includes("admin"),
  ).length
  const recentUsers = [...userList]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5)

  return (
    <AdminLayout>
      <WelcomeSection>
        <WelcomeTitle>
          안녕하세요,{" "}
          {user?.user?.user_metadata?.name ?? user?.user?.email ?? "관리자"}님
        </WelcomeTitle>
        <WelcomeText>
          통합 관리 대시보드입니다. 서비스 전체의 사용자·워크스페이스를
          관리합니다.
        </WelcomeText>
      </WelcomeSection>

      <StatsGrid>
        <StatCard variant="blue">
          <StatTitle>전체 사용자</StatTitle>
          <StatValue>{totalUsers}</StatValue>
        </StatCard>
        <StatCard variant="green">
          <StatTitle>이번 달 신규 가입</StatTitle>
          <StatValue>{newThisMonth}</StatValue>
        </StatCard>
        <StatCard variant="purple">
          <StatTitle>관리자 수</StatTitle>
          <StatValue>{adminCount}</StatValue>
        </StatCard>
        <StatCard variant="slate">
          <StatTitle>전체 워크스페이스</StatTitle>
          <StatValue>{workspaces.length}</StatValue>
        </StatCard>
      </StatsGrid>

      <ContentGrid>
        <ContentCard>
          <CardHeader>
            <CardTitle>최근 가입한 사용자</CardTitle>
            <ViewAllLink href="/admin/users">전체 보기 →</ViewAllLink>
          </CardHeader>
          <UserList>
            {recentUsers.length === 0 ? (
              <UserItem>
                <UserEmail style={{ color: COLORS.gray[500] }}>
                  사용자가 없습니다.
                </UserEmail>
              </UserItem>
            ) : (
              recentUsers.map((u) => (
                <UserItem key={u.id}>
                  <UserInfo>
                    <UserAvatar>
                      {u.email?.[0]?.toUpperCase() ?? "?"}
                    </UserAvatar>
                    <UserDetails>
                      <UserEmail>{u.email ?? u.id}</UserEmail>
                      <UserDate>
                        가입일: {new Date(u.created_at).toLocaleDateString()}
                      </UserDate>
                    </UserDetails>
                  </UserInfo>
                  <UserRole
                    isAdmin={String(u.user_metadata?.role).includes("admin")}>
                    {String(u.user_metadata?.role).includes("admin")
                      ? "관리자"
                      : "사용자"}
                  </UserRole>
                </UserItem>
              ))
            )}
          </UserList>
        </ContentCard>

        <ContentCard>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
          </CardHeader>
          <QuickActions>
            <ActionButton href="/admin/signup-requests">
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </ActionIcon>
              <ActionText>가입 승인</ActionText>
            </ActionButton>
            <ActionButton href="/admin/users">
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </ActionIcon>
              <ActionText>사용자 관리</ActionText>
            </ActionButton>
            <ActionButton href="/admin/workspaces">
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </ActionIcon>
              <ActionText>워크스페이스 관리</ActionText>
            </ActionButton>
          </QuickActions>
        </ContentCard>
      </ContentGrid>
    </AdminLayout>
  )
}
