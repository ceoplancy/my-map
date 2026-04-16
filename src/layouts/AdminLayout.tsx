import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import Sidebar from "@/components/admin/Sidebar"
import Header from "@/components/admin/Header"
import { FullPageLoader } from "@/components/FullPageLoader"
import styled from "@emotion/styled"
import { useGetUserData, useMyWorkspaces } from "@/api/auth"
import { toast } from "react-toastify"
import { useCurrentWorkspace } from "@/store/workspaceState"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface AdminLayoutProps {
  children: React.ReactNode
}

const MOBILE_NAV_QUERY = "(max-width: 899px)"

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  height: 100dvh;
  background-color: #fff;
  position: relative;
`

const MainContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const MainContent = styled.main`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: #fff;
  padding: 1.5rem;
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));

  @media (max-width: 899px) {
    padding: 1rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
`

const NavBackdrop = styled.button`
  position: fixed;
  inset: 0;
  z-index: 199;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
`

const SidebarShell = styled.aside<{ $mobile: boolean; $open: boolean }>`
  ${(p) =>
    p.$mobile
      ? `
    position: fixed;
    z-index: 200;
    left: 0;
    top: 0;
    height: 100%;
    height: 100dvh;
    max-width: min(18rem, 88vw);
    transform: translateX(${p.$open ? "0" : "-100%"});
    transition: transform 0.28s ease;
    box-shadow: ${p.$open ? "8px 0 32px rgba(0,0,0,0.12)" : "none"};
    padding-top: env(safe-area-inset-top);
  `
      : `
    position: relative;
    flex-shrink: 0;
    height: 100%;
  `}
`

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const [, setCurrentWorkspace] = useCurrentWorkspace()
  const isMobileNav = useMediaQuery(MOBILE_NAV_QUERY)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { data: user, isLoading: userLoading } = useGetUserData()
  const hasUser = Boolean(user?.user)
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces({ enabled: hasUser })

  const ready = !userLoading && (!hasUser || !workspacesLoading)

  useEffect(() => {
    if (!ready) return
    if (!user?.user) {
      router.push("/sign-in")

      return
    }

    const legacyAdmin = user.user.user_metadata?.role?.includes("admin")
    const hasWorkspace = Array.isArray(workspaces) && workspaces.length > 0
    if (!legacyAdmin && !hasWorkspace) {
      toast.error("관리자 권한이 없습니다.")
      router.push("/workspaces")

      return
    }

    if (hasWorkspace && workspaces.length > 0) {
      setCurrentWorkspace((prev) => prev ?? workspaces[0] ?? null)
    }
  }, [ready, router, user?.user, workspaces, setCurrentWorkspace])

  useEffect(() => {
    if (!isMobileNav) setMobileNavOpen(false)
  }, [isMobileNav])

  if (!ready) {
    return <FullPageLoader message="권한을 확인하는 중입니다..." />
  }

  return (
    <LayoutContainer>
      {isMobileNav && mobileNavOpen && (
        <NavBackdrop
          type="button"
          aria-label="메뉴 닫기"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <SidebarShell $mobile={isMobileNav} $open={!isMobileNav || mobileNavOpen}>
        <Sidebar
          onNavigate={isMobileNav ? () => setMobileNavOpen(false) : undefined}
        />
      </SidebarShell>
      <MainContainer>
        <Header
          onMobileMenuToggle={
            isMobileNav ? () => setMobileNavOpen((v) => !v) : undefined
          }
          mobileMenuOpen={isMobileNav ? mobileNavOpen : false}
        />
        <MainContent>{children}</MainContent>
      </MainContainer>
    </LayoutContainer>
  )
}
