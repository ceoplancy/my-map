import AdminLayout from "@/layouts/AdminLayout"
import { useGetUsers } from "@/api/supabase"
import Link from "next/link"
import { useGetUserData } from "@/api/auth"
import styled from "styled-components"
import { COLORS } from "@/styles/global-style"
import { toast } from "react-toastify"

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

export default function AdminDashboard() {
  const { data: user } = useGetUserData()
  const { data: users } = useGetUsers()

  // 최근 가입한 사용자 5명만 표시
  if (!users) return null
  const recentUsers = users.users.slice(0, 5)

  return (
    <AdminLayout>
      {/* 환영 섹션 */}
      <WelcomeSection>
        <WelcomeTitle>
          안녕하세요,{" "}
          {user?.user.user_metadata.name
            ? user?.user.user_metadata.name
            : user?.user.email}
          님 👋
        </WelcomeTitle>
        <WelcomeText>
          관리자 대시보드에 오신 것을 환영합니다. 여기에서 서비스의 모든 측면을
          관리하실 수 있습니다.
        </WelcomeText>
      </WelcomeSection>

      <StatsGrid>
        {/* 통계 카드 */}
        <StatCard variant="blue">
          <StatTitle>전체 사용자</StatTitle>
          <StatValue>{users.users.length || 0}</StatValue>
        </StatCard>

        <StatCard variant="green">
          <StatTitle>이번 달 신규 가입</StatTitle>
          <StatValue>
            {users.users.filter(
              (user) =>
                new Date(user.created_at).getMonth() === new Date().getMonth(),
            ).length || 0}
          </StatValue>
        </StatCard>

        <StatCard variant="purple">
          <StatTitle>관리자 수</StatTitle>
          <StatValue>
            {users.users.filter((user) => user.user_metadata?.role === "admin")
              .length || 0}
          </StatValue>
        </StatCard>
      </StatsGrid>

      {/* 최근 활동 섹션 */}
      <ContentGrid>
        {/* 최근 가입한 사용자 */}
        <ContentCard>
          <CardHeader>
            <CardTitle>최근 가입한 사용자</CardTitle>
            <ViewAllLink href="/admin/users">전체 보기 →</ViewAllLink>
          </CardHeader>
          <UserList>
            {recentUsers.map((user) => (
              <UserItem key={user.id}>
                <UserInfo>
                  <UserAvatar>
                    <UserAvatarText>
                      {user.email?.[0].toUpperCase()}
                    </UserAvatarText>
                  </UserAvatar>
                  <UserDetails>
                    <UserEmail>{user.email}</UserEmail>
                    <UserDate>
                      가입일: {new Date(user.created_at).toLocaleDateString()}
                    </UserDate>
                  </UserDetails>
                </UserInfo>
                <UserRole isAdmin={user.user_metadata?.role === "admin"}>
                  {user.user_metadata?.role === "admin" ? "관리자" : "사용자"}
                </UserRole>
              </UserItem>
            ))}
          </UserList>
        </ContentCard>

        {/* 빠른 작업 */}
        <ContentCard>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
          </CardHeader>
          <QuickActions>
            <ActionButton href="/admin/users">
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

            <ActionButton href="/admin/shareholders">
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

            {/* <ActionButton href="/admin/shareholders?upload=true"> */}
            <ActionButton href="/excel-import">
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
    </AdminLayout>
  )
}
