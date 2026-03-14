import { useRouter } from "next/router"
import { useEffect } from "react"
import Sidebar from "@/components/admin/Sidebar"
import Header from "@/components/admin/Header"
import styled from "@emotion/styled"
import { useGetUserData, useMyWorkspaces } from "@/api/auth"
import { toast } from "react-toastify"
import { useSetRecoilState } from "recoil"
import { currentWorkspaceState } from "@/store/workspaceState"

interface AdminLayoutProps {
  children: React.ReactNode
}

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #fff;
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
  const setCurrentWorkspace = useSetRecoilState(currentWorkspaceState)
  const { data: user, isLoading } = useGetUserData()
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()

  useEffect(() => {
    if (!isLoading && !workspacesLoading) {
      if (!user?.user) {
        router.push("/sign-in")

        return
      }

      const legacyAdmin = user.user.user_metadata?.role?.includes("admin")
      const hasWorkspace = Array.isArray(workspaces) && workspaces.length > 0
      if (!legacyAdmin && !hasWorkspace) {
        toast.error("관리자 권한이 없습니다.")
        router.push("/")

        return
      }

      if (hasWorkspace && workspaces.length > 0) {
        setCurrentWorkspace((prev) => prev ?? workspaces[0] ?? null)
      }
    }
  }, [
    router,
    user,
    isLoading,
    workspaces,
    workspacesLoading,
    setCurrentWorkspace,
  ])

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
      <Sidebar />
      <MainContainer>
        <Header />
        <MainContent>{children}</MainContent>
      </MainContainer>
    </LayoutContainer>
  )
}
