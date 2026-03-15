import { useGetUserData, useMyWorkspaces } from "@/api/auth"
import supabase from "@/lib/supabase/supabaseClient"
import { useCurrentWorkspace } from "@/store/workspaceState"
import { COLORS } from "@/styles/global-style"
import { ADMIN, WORKSPACE_ADMIN_SEGMENT_LABELS } from "@/lib/admin-routes"
import {
  getWorkspaceIdFromPath,
  isIntegratedRoute,
  isWorkspaceAdminDashboardRoute,
  isWorkspaceAdminRoute,
} from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/router"
import { useState, useRef, useEffect } from "react"
import styled from "@emotion/styled"
import { toast } from "react-toastify"
import { reportError } from "@/lib/reportError"

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

const _IconButton = styled.button`
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

const _ProfileAvatar = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background-color: #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
`

const _ProfileEmail = styled.span`
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

const _BreadcrumbLink = styled.span`
  cursor: pointer;
  &:hover {
    color: #374151;
  }
`

const FlexContainer = styled.div`
  display: flex;
  align-items: center;
`

const _NotificationIcon = styled.svg`
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

const WorkspaceSelect = styled.select`
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 6px;
  font-size: 0.875rem;
  background-color: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1rem;
  color: ${COLORS.gray[700]};
  min-width: 160px;
  appearance: none;
  cursor: pointer;

  &:hover {
    border-color: ${COLORS.gray[400]};
  }
  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
  }
`

const WorkspaceChangeButton = styled.button`
  font-size: 0.8125rem;
  color: ${COLORS.blue[600]};
  text-decoration: none;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`

const MapLink = styled(Link)`
  font-size: 0.8125rem;
  color: ${COLORS.blue[600]};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`

export default function Header() {
  const { data: user } = useGetUserData()
  const { data: workspaces = [] } = useMyWorkspaces()
  const [currentWorkspace, setCurrentWorkspace] = useCurrentWorkspace()
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
      reportError(error, { toastMessage: "로그아웃에 실패했습니다." })
    }
  }

  return (
    <HeaderContainer>
      <HeaderContent>
        <FlexContainer>
          <PageTitle>
            {router.pathname === ADMIN.INTEGRATED && "통합 대시보드"}
            {router.pathname === ADMIN.SIGNUP_REQUESTS && "가입 승인"}
            {router.pathname === ADMIN.USERS && "사용자 관리"}
            {router.pathname.startsWith(`${ADMIN.USERS}/`) && "사용자 상세"}
            {router.pathname === ADMIN.WORKSPACES && "워크스페이스 관리"}
            {(router.pathname === ADMIN.ROOT ||
              isWorkspaceAdminDashboardRoute(router.pathname)) &&
              "대시보드"}
            {isWorkspaceAdminRoute(router.pathname) &&
              (() => {
                const seg = router.pathname.split("/").pop() ?? ""
                if (seg === "[listId]") return "주주 관리"

                return WORKSPACE_ADMIN_SEGMENT_LABELS[seg] ?? seg
              })()}
          </PageTitle>
        </FlexContainer>

        <RightSection>
          {!isIntegratedRoute(router.pathname) && workspaces.length > 1 && (
            <WorkspaceSelect
              value={currentWorkspace?.id ?? ""}
              onChange={(e) => {
                const ws = workspaces.find((w) => w.id === e.target.value)
                if (ws) setCurrentWorkspace(ws)
              }}>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </WorkspaceSelect>
          )}
          {!isIntegratedRoute(router.pathname) && workspaces.length > 0 && (
            <WorkspaceChangeButton
              type="button"
              onClick={() => router.push("/workspaces")}>
              워크스페이스 변경
            </WorkspaceChangeButton>
          )}
          {!isIntegratedRoute(router.pathname) &&
            currentWorkspace?.id != null && (
              <MapLink href={`/workspaces/${currentWorkspace.id}`}>
                지도로 이동
              </MapLink>
            )}
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
          <BreadcrumbItem
            onClick={() => {
              if (isIntegratedRoute(router.pathname))
                router.push(ADMIN.INTEGRATED)
              else if (currentWorkspace)
                router.push(`/workspaces/${currentWorkspace.id}/admin`)
              else {
                const wid = getWorkspaceIdFromPath(router.pathname)
                if (wid) router.push(`/workspaces/${wid}/admin`)
                else router.push(ADMIN.INTEGRATED)
              }
            }}>
            {isIntegratedRoute(router.pathname) ? "통합 관리" : "관리자"}
          </BreadcrumbItem>
          {isWorkspaceAdminDashboardRoute(router.pathname) ? (
            <>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbCurrent>대시보드</BreadcrumbCurrent>
            </>
          ) : isWorkspaceAdminRoute(router.pathname) ? (
            (() => {
              const seg = router.pathname.split("/").pop() ?? ""
              const label =
                seg === "[listId]"
                  ? "주주 관리"
                  : (WORKSPACE_ADMIN_SEGMENT_LABELS[seg] ?? seg)

              return (
                <>
                  <BreadcrumbSeparator>/</BreadcrumbSeparator>
                  <BreadcrumbCurrent>{label}</BreadcrumbCurrent>
                </>
              )
            })()
          ) : (
            router.pathname
              .split("/")
              .slice(2)
              .map((path, index, array) => (
                <span key={`${path}-${index}`}>
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
              ))
          )}
        </BreadcrumbText>
      </BreadcrumbContainer>
    </HeaderContainer>
  )
}
