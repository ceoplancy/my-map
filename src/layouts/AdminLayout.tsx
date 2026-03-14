import { useRouter } from "next/router"
import { useEffect } from "react"
import Sidebar from "@/components/admin/Sidebar"
import Header from "@/components/admin/Header"
import { FullPageLoader } from "@/components/FullPageLoader"
import styled from "@emotion/styled"
import { useGetUserData, useMyWorkspaces } from "@/api/auth"
import { toast } from "react-toastify"
import { useCurrentWorkspace } from "@/store/workspaceState"

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

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const [, setCurrentWorkspace] = useCurrentWorkspace()
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

  if (!ready) {
    return <FullPageLoader message="권한을 확인하는 중입니다..." />
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
