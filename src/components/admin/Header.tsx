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
import Select from "@/components/ui/select"
import { Menu as MenuIcon } from "@mui/icons-material"

const HeaderContainer = styled.header`
  position: relative;
  z-index: 20;
  background-color: white;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  flex-shrink: 0;
  padding-top: env(safe-area-inset-top);
  border-bottom: 1px solid ${COLORS.gray[100]};
`

const HeaderContent = styled.div`
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: nowrap;

  @media (max-width: 899px) {
    padding: 0.625rem 1rem 0.75rem;
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto auto;
    grid-template-areas:
      "menu title profile"
      "toolbar toolbar toolbar";
    align-items: center;
    gap: 0.5rem 0.75rem;
    flex-wrap: nowrap;
  }
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1 1 auto;

  @media (max-width: 899px) {
    grid-area: title;
    min-width: 0;
  }
`

const MobileMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: none;
  border-radius: 0.75rem;
  background: ${COLORS.gray[100]};
  color: ${COLORS.gray[800]};
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${COLORS.gray[200]};
  }

  @media (max-width: 899px) {
    display: inline-flex;
    grid-area: menu;
  }
`

const PageTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  min-width: 0;
  line-height: 1.3;

  @media (max-width: 899px) {
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const ToolbarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex: 0 1 auto;
  min-width: 0;

  @media (max-width: 899px) {
    grid-area: toolbar;
    width: 100%;
    flex: none;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0.5rem;
    padding-top: 0.5rem;
    margin-top: 0;
    border-top: 1px solid ${COLORS.gray[100]};
    flex-wrap: nowrap;
  }
`

const ProfileSlot = styled.div`
  position: relative;
  flex-shrink: 0;

  @media (max-width: 899px) {
    grid-area: profile;
    justify-self: end;
  }
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
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 0.25rem;
  z-index: 50;
  border: 1px solid ${COLORS.gray[100]};
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
  background-color: ${COLORS.gray[50]};
  border-bottom: 1px solid ${COLORS.gray[100]};

  @media (max-width: 899px) {
    padding: 0.5rem 1rem 0.625rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    white-space: nowrap;
  }
`

const BreadcrumbText = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.25rem;
`

const _BreadcrumbLink = styled.span`
  cursor: pointer;
  &:hover {
    color: #374151;
  }
`

const _NotificationIcon = styled.svg`
  width: 1.5rem;
  height: 1.5rem;
  color: ${COLORS.gray[600]};
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

  @media (max-width: 899px) {
    padding: 0.35rem;
    gap: 0;
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
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 899px) {
    display: none;
  }
`

const DropdownIcon = styled.svg`
  width: 1rem;
  height: 1rem;
  color: ${COLORS.gray[500]};

  @media (max-width: 899px) {
    display: none;
  }
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

const WorkspaceSelectWrapper = styled(Select)`
  min-width: 160px;

  @media (max-width: 899px) {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    flex: none;
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

  @media (max-width: 899px) {
    font-size: 0.8125rem;
    padding: 0.5rem 0.75rem;
    background: ${COLORS.white};
    border: 1px solid ${COLORS.gray[200]};
    border-radius: 0.625rem;
    text-decoration: none;
    font-weight: 600;
    flex: 1 1 auto;
    min-height: 2.5rem;
    text-align: center;
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

  @media (max-width: 899px) {
    font-size: 0.8125rem;
    padding: 0.5rem 0.75rem;
    background: ${COLORS.blue[50]};
    border: 1px solid ${COLORS.blue[100]};
    border-radius: 0.625rem;
    text-decoration: none;
    font-weight: 600;
    flex: 1 1 auto;
    min-height: 2.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
`

type HeaderProps = {
  onMobileMenuToggle?: () => void
  mobileMenuOpen?: boolean
}

export default function Header({
  onMobileMenuToggle,
  mobileMenuOpen = false,
}: HeaderProps) {
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
        {onMobileMenuToggle && (
          <MobileMenuButton
            type="button"
            aria-label={
              mobileMenuOpen ? "사이드 메뉴 닫기" : "사이드 메뉴 열기"
            }
            aria-expanded={mobileMenuOpen}
            onClick={onMobileMenuToggle}>
            <MenuIcon sx={{ fontSize: 24 }} />
          </MobileMenuButton>
        )}
        <TitleRow>
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
        </TitleRow>

        <ToolbarSection>
          {!isIntegratedRoute(router.pathname) && workspaces.length > 1 && (
            <WorkspaceSelectWrapper
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
            </WorkspaceSelectWrapper>
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
        </ToolbarSection>

        <ProfileSlot ref={dropdownRef}>
          <ProfileButtonContainer
            onClick={() => setIsProfileOpen(!isProfileOpen)}>
            <AvatarContainer>
              <AvatarText>
                {user?.user?.email?.[0]?.toUpperCase() ?? "?"}
              </AvatarText>
            </AvatarContainer>
            <UserEmail>{user?.user?.email}</UserEmail>
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
                  toast.info("준비 중인 기능입니다.")
                }}>
                프로필 설정
              </DropdownButton>
              <DropdownButton isRed onClick={handleLogout}>
                로그아웃
              </DropdownButton>
            </DropdownMenu>
          )}
        </ProfileSlot>
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
