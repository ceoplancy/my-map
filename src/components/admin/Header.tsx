import { useGetUserData } from "@/api/auth"
import supabase from "@/lib/supabase/supabaseClient"
import { COLORS } from "@/styles/global-style"
import { useRouter } from "next/router"
import { useState, useRef, useEffect } from "react"
import styled from "@emotion/styled"
import { toast } from "react-toastify"
import * as Sentry from "@sentry/nextjs"

const HeaderContainer = styled.header`
  background-color: white;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
`

const HeaderContent = styled.div`
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const PageTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
`

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const IconButton = styled.button`
  padding: 0.5rem;
  border-radius: 9999px;
  &:hover {
    background-color: #f3f4f6;
  }
`

const ProfileButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 9999px;
  &:hover {
    background-color: #f3f4f6;
  }
`

const ProfileAvatar = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background-color: #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ProfileEmail = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`

const DropdownMenu = styled.div`
  position: absolute;
  right: 0;
  margin-top: 0.5rem;
  width: 12rem;
  background-color: white;
  border-radius: 0.375rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 0.25rem;
  z-index: 10;
`

const DropdownButton = styled.button<{ isRed?: boolean }>`
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  color: ${(props) => (props.isRed ? "#dc2626" : "#374151")};
  &:hover {
    background-color: #f3f4f6;
  }
`

const BreadcrumbContainer = styled.div`
  padding: 0.5rem 1.5rem;
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
  border-top: 1px solid #e5e7eb;
`

const BreadcrumbText = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`

const BreadcrumbLink = styled.span`
  cursor: pointer;
  &:hover {
    color: #374151;
  }
`

const FlexContainer = styled.div`
  display: flex;
  align-items: center;
`

const NotificationIcon = styled.svg`
  width: 1.5rem;
  height: 1.5rem;
  color: ${COLORS.gray[600]};
`

const ProfileDropdown = styled.div`
  position: relative;
`

const ProfileButtonContainer = styled(ProfileButton)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 9999px;

  &:hover {
    background-color: ${COLORS.gray[100]};
  }
`

const AvatarContainer = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background-color: ${COLORS.gray[300]};
  display: flex;
  align-items: center;
  justify-content: center;
`

const AvatarText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${COLORS.gray[600]};
`

const UserEmail = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${COLORS.gray[700]};
`

const DropdownIcon = styled.svg`
  width: 1rem;
  height: 1rem;
  color: ${COLORS.gray[500]};
`

const BreadcrumbItem = styled.span`
  cursor: pointer;
  color: ${COLORS.gray[500]};

  &:hover {
    color: ${COLORS.gray[700]};
  }
`

const BreadcrumbSeparator = styled.span`
  margin: 0 0.5rem;
  color: ${COLORS.gray[500]};
`

const BreadcrumbCurrent = styled.span`
  color: ${COLORS.gray[900]};
`

export default function Header() {
  const { data: user } = useGetUserData()
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/sign-in")
    } catch (error) {
      Sentry.captureException(error)
      Sentry.captureMessage("로그아웃에 실패했습니다.")
    }
  }

  return (
    <HeaderContainer>
      <HeaderContent>
        <FlexContainer>
          <PageTitle>
            {/* 현재 페이지 경로에 따른 타이틀 표시 */}
            {router.pathname === "/admin" && "대시보드"}
            {router.pathname === "/admin/users" && "사용자 관리"}
            {router.pathname.startsWith("/admin/users/") && "사용자 상세"}
          </PageTitle>
        </FlexContainer>

        <RightSection>
          {/* 알림 아이콘 */}
          {/* <IconButton>
            <NotificationIcon
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </NotificationIcon>
          </IconButton> */}

          {/* 프로필 드롭다운 */}
          <ProfileDropdown ref={dropdownRef}>
            <ProfileButtonContainer
              onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <AvatarContainer>
                <AvatarText>{user?.user.email?.[0].toUpperCase()}</AvatarText>
              </AvatarContainer>
              <UserEmail>{user?.user.email}</UserEmail>
              <DropdownIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M19 9l-7 7-7-7"></path>
              </DropdownIcon>
            </ProfileButtonContainer>

            {isProfileOpen && (
              <DropdownMenu>
                <DropdownButton
                  onClick={() => {
                    setIsProfileOpen(false)
                    // router.push("/admin/profile")
                    toast.info("준비 중인 기능입니다.")
                  }}>
                  프로필 설정
                </DropdownButton>
                <DropdownButton isRed onClick={handleLogout}>
                  로그아웃
                </DropdownButton>
              </DropdownMenu>
            )}
          </ProfileDropdown>
        </RightSection>
      </HeaderContent>

      {/* 현재 경로 표시 (Breadcrumb) */}
      <BreadcrumbContainer>
        <BreadcrumbText>
          <BreadcrumbItem onClick={() => router.push("/admin")}>
            관리자
          </BreadcrumbItem>
          {router.pathname
            .split("/")
            .slice(2)
            .map((path, index, array) => (
              <span key={path}>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                {index === array.length - 1 ? (
                  <BreadcrumbCurrent>
                    {path === "shareholders"
                      ? "주주명부"
                      : path === "users"
                        ? "사용자 관리"
                        : path}
                  </BreadcrumbCurrent>
                ) : (
                  <BreadcrumbItem
                    onClick={() =>
                      router.push(
                        `/admin/${array.slice(0, index + 1).join("/")}`,
                      )
                    }>
                    {path === "shareholders"
                      ? "주주명부"
                      : path === "users"
                        ? "사용자 관리"
                        : path}
                  </BreadcrumbItem>
                )}
              </span>
            ))}
        </BreadcrumbText>
      </BreadcrumbContainer>
    </HeaderContainer>
  )
}
