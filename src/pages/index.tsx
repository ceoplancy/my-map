import { useEffect } from "react"
import { useRouter } from "next/router"
import {
  useGetUserData,
  usePostSignOut,
  useMyWorkspaces,
  useMySignupStatus,
} from "@/api/auth"
import { useCurrentWorkspace } from "@/store/workspaceState"
import styled from "@emotion/styled"

/**
 * Root (/) only redirects:
 * - Not logged in → /sign-in
 * - Pending approval → show pending UI
 * - No current workspace → /workspaces
 * - Has current workspace → /workspaces/[workspaceId] (map)
 * The actual map lives at /workspaces/[workspaceId].
 */
export default function HomeRedirect() {
  const router = useRouter()
  const { data: user, isLoading } = useGetUserData()
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()
  const { data: signupStatus, isLoading: signupStatusLoading } =
    useMySignupStatus()
  const [currentWorkspace] = useCurrentWorkspace()
  const { mutate: logout } = usePostSignOut()

  const hasWorkspace = Array.isArray(workspaces) && workspaces.length > 0
  const legacyAdmin = String(user?.user?.user_metadata?.role).includes("admin")
  const pendingApproval =
    user?.user &&
    !workspacesLoading &&
    !signupStatusLoading &&
    !hasWorkspace &&
    !legacyAdmin &&
    signupStatus &&
    signupStatus.status === "pending"

  useEffect(() => {
    if (isLoading || !router.isReady) return
    if (!user?.user) {
      router.replace("/sign-in")

      return
    }
    if (pendingApproval) return
    if (!currentWorkspace) {
      router.replace("/workspaces")

      return
    }
    router.replace(`/workspaces/${currentWorkspace.id}`)
  }, [isLoading, router, user?.user, currentWorkspace, pendingApproval])

  if (pendingApproval) {
    return (
      <PendingContainer>
        <PendingCard>
          <PendingTitle>가입 승인 대기 중</PendingTitle>
          <PendingText>
            가입 신청이 접수되었습니다. 운영사 승인 후 서비스를 이용할 수
            있습니다.
          </PendingText>
          <LogoutButton onClick={() => logout()}>로그아웃</LogoutButton>
        </PendingCard>
      </PendingContainer>
    )
  }

  return null
}

const PendingContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 1rem;
`

const PendingCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
`

const PendingTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1f2937;
`

const PendingText = styled.p`
  font-size: 0.9375rem;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 1.5rem;
`

const LogoutButton = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    background: #1557b0;
  }
`
