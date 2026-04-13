import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import Sidebar from "@/components/admin/Sidebar"
import Header from "@/components/admin/Header"
import styled from "@emotion/styled"
import { useGetUserData } from "@/api/auth"
import { toast } from "react-toastify"
import { Menu as MenuIcon, Close as CloseIcon } from "@mui/icons-material"

interface AdminLayoutProps {
  children: React.ReactNode
}

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #fff;
  position: relative;
`

const MobileNavToggle = styled.button`
  display: none;
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 50;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  color: #374151;

  @media (max-width: 900px) {
    display: flex;
  }
`

const SidebarBackdrop = styled.div<{ $open: boolean }>`
  display: none;
  @media (max-width: 900px) {
    display: ${({ $open }) => ($open ? "block" : "none")};
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 40;
  }
`

const MainContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`

const MainContent = styled.main`
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  background-color: #fff;
  padding: 1.5rem;

  @media (max-width: 900px) {
    padding: 1rem;
    padding-top: 3.75rem;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  height: 100vh;
  align-items: center;
  justify-content: center;
`

const LoadingContent = styled.div`
  text-align: center;
`

const LoadingSpinner = styled.div`
  animation: spin 1s linear infinite;
  margin: 0 auto;
  height: 3rem;
  width: 3rem;
  border-radius: 9999px;
  border-bottom: 2px solid #111827;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`

const LoadingText = styled.p`
  margin-top: 1rem;
`

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const { data: user, isLoading } = useGetUserData()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (!user?.user) {
        router.push("/sign-in")

        return
      }

      const isAdmin = user.user.user_metadata.role.includes("admin")

      if (!isAdmin) {
        toast.error("관리자 권한이 없습니다.")
        router.push("/")

        return
      }
    }
  }, [router, user, isLoading])

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingContent>
          <LoadingSpinner />
          <LoadingText>권한을 확인하는 중입니다...</LoadingText>
        </LoadingContent>
      </LoadingContainer>
    )
  }

  return (
    <LayoutContainer>
      <MobileNavToggle
        type="button"
        aria-label={mobileNavOpen ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setMobileNavOpen((o) => !o)}>
        {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
      </MobileNavToggle>
      <SidebarBackdrop
        $open={mobileNavOpen}
        aria-hidden
        onClick={() => setMobileNavOpen(false)}
      />
      <Sidebar
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />
      <MainContainer>
        <Header />
        <MainContent>{children}</MainContent>
      </MainContainer>
    </LayoutContainer>
  )
}
