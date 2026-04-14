import type { ReactNode } from "react"
import { COLORS } from "@/styles/global-style"
import Link from "next/link"
import styled from "@emotion/styled"
import {
  Dashboard,
  People,
  List as ListIcon,
  Business,
  PersonAdd,
} from "@mui/icons-material"
import { usePathname } from "next/navigation"
import { useAdminStatus } from "@/api/auth"
import { ADMIN, getWorkspaceAdminBase } from "@/lib/admin-routes"
import {
  isIntegratedRoute,
  isWorkspaceAdminDashboardRoute,
  normalizePathname,
} from "@/lib/utils"
import { useCurrentWorkspace } from "@/store/workspaceState"

const SidebarContainer = styled.aside<{
  $mobileOpen?: boolean
}>`
  width: 16rem;
  background-color: ${COLORS.white};
  box-shadow: 4px 0 6px -1px rgba(0, 0, 0, 0.1);
  height: 100%;
  border-right: 1px solid #e5e7eb;
  flex-shrink: 0;
  z-index: 45;
  transition: transform 0.25s ease;

  @media (max-width: 900px) {
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    max-width: min(18rem, 88vw);
    transform: translateX(
      ${({ $mobileOpen }) => ($mobileOpen ? "0" : "-100%")}
    );
    box-shadow: ${({ $mobileOpen }) =>
      $mobileOpen ? "8px 0 24px rgba(0,0,0,0.12)" : "none"};
  }
`

const LogoContainer = styled.div`
  padding: 1.5rem;
`

const LogoSection = styled.div`
  padding: 1.5rem;
`

const LogoText = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  color: ${COLORS.gray[900]};
`

const Navigation = styled.nav`
  margin-top: 1.5rem;
`

const NavLink = styled(Link)`
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: ${COLORS.gray[700]};
  text-decoration: none;
  transition: background-color 0.2s;
  cursor: pointer;
  min-height: 2.75rem;
  box-sizing: border-box;

  &:hover {
    background-color: ${COLORS.gray[100]};
  }

  &.active {
    background-color: ${COLORS.gray[100]};
  }
`

const NavIcon = styled.span`
  margin-right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
`

const NavText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
`

const SectionLabel = styled.div`
  padding: 0.5rem 1.5rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${COLORS.gray[500]};
`

const Section = styled.div`
  margin-bottom: 0.5rem;
`

/** 주주명부 하위 메뉴는 들여쓰기 */
const NavLinkSub = styled(NavLink)`
  padding-left: 2.25rem;
  min-height: 2.25rem;
`

/** 통합 관리(서비스 최고 관리자 전용): 플랫폼 전체 */
const INTEGRATED_MENU_ITEMS = [
  { title: "대시보드", path: ADMIN.INTEGRATED, icon: <Dashboard /> },
  { title: "가입 승인", path: ADMIN.SIGNUP_REQUESTS, icon: <PersonAdd /> },
  { title: "사용자 관리", path: ADMIN.USERS, icon: <People /> },
  { title: "워크스페이스 관리", path: ADMIN.WORKSPACES, icon: <Business /> },
]

/** 워크스페이스: 주주명부 (목록·관리·파일 가져오기 통합) */
const WORKSPACE_SHAREHOLDER_ITEM = {
  title: "주주명부",
  path: "/lists",
  icon: <ListIcon />,
}

/** 워크스페이스: 사용자 관리 */
const WORKSPACE_USERS = {
  title: "사용자 관리",
  path: "/users",
  icon: <People />,
}

type NavItem = { title: string; path: string; icon: ReactNode }

function NavItems({
  items,
  pathname,
  pathPrefix = "",
  useSubStyle = false,
  onNavigate,
}: {
  items: NavItem[]
  pathname: string
  pathPrefix?: string
  useSubStyle?: boolean
  onNavigate?: () => void
}) {
  const LinkComponent = useSubStyle ? NavLinkSub : NavLink

  return (
    <>
      {items.map((item) => {
        const fullPath = pathPrefix ? pathPrefix + item.path : item.path

        return (
          <LinkComponent
            key={fullPath}
            href={fullPath}
            onClick={() => onNavigate?.()}
            className={
              normalizePathname(pathname) === normalizePathname(fullPath)
                ? "active"
                : ""
            }>
            <NavIcon>{item.icon}</NavIcon>
            <NavText>{item.title}</NavText>
          </LinkComponent>
        )
      })}
    </>
  )
}

function SingleNavLink({
  item,
  pathname,
  pathPrefix,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  pathPrefix: string
  onNavigate?: () => void
}) {
  const fullPath = pathPrefix + item.path

  return (
    <NavLink
      href={fullPath}
      onClick={() => onNavigate?.()}
      className={
        normalizePathname(pathname) === normalizePathname(fullPath)
          ? "active"
          : ""
      }>
      <NavIcon>{item.icon}</NavIcon>
      <NavText>{item.title}</NavText>
    </NavLink>
  )
}

type SidebarProps = {
  mobileOpen?: boolean
  onNavigate?: () => void
}

export default function Sidebar({
  mobileOpen = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname()
  const [currentWorkspace] = useCurrentWorkspace()
  const { data: adminStatus } = useAdminStatus()
  const isServiceAdmin = adminStatus?.isServiceAdmin ?? false
  const integrated = isIntegratedRoute(pathname)

  return (
    <SidebarContainer $mobileOpen={mobileOpen}>
      <LogoContainer>
        <LogoSection>
          <LogoText>관리자 패널</LogoText>
        </LogoSection>
      </LogoContainer>
      <Navigation>
        {integrated ? (
          isServiceAdmin && (
            <Section>
              <SectionLabel>통합 관리</SectionLabel>
              <NavItems
                items={INTEGRATED_MENU_ITEMS}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            </Section>
          )
        ) : (
          <>
            <Section>
              {currentWorkspace && (
                <NavLink
                  href={`/workspaces/${currentWorkspace.id}/admin`}
                  onClick={() => onNavigate?.()}
                  className={
                    isWorkspaceAdminDashboardRoute(pathname) ? "active" : ""
                  }>
                  <NavIcon>
                    <Dashboard />
                  </NavIcon>
                  <NavText>대시보드</NavText>
                </NavLink>
              )}
              {currentWorkspace && (
                <>
                  <SectionLabel>주주명부</SectionLabel>
                  <SingleNavLink
                    item={WORKSPACE_SHAREHOLDER_ITEM}
                    pathname={pathname}
                    pathPrefix={getWorkspaceAdminBase(currentWorkspace.id)}
                    onNavigate={onNavigate}
                  />
                </>
              )}
              {currentWorkspace && (
                <SingleNavLink
                  item={WORKSPACE_USERS}
                  pathname={pathname}
                  pathPrefix={getWorkspaceAdminBase(currentWorkspace.id)}
                  onNavigate={onNavigate}
                />
              )}
            </Section>
          </>
        )}
      </Navigation>
    </SidebarContainer>
  )
}
