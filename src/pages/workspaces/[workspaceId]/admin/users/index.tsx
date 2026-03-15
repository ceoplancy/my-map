import { useRouter } from "next/router"
import AdminLayout from "@/layouts/AdminLayout"
import { useGetUserData } from "@/api/auth"
import { MembersPageContent } from "@/pages/admin/members"
import GlobalSpinner from "@/components/ui/global-spinner"
import { useWorkspaceAdminRoute } from "@/hooks/useWorkspaceAdminRoute"
import styled from "@emotion/styled"

const SpinnerFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
`

/** 해당 워크스페이스의 사용자(멤버) 관리 */
export default function WorkspaceAdminUsersPage() {
  const router = useRouter()
  const { resolvedWorkspace, isReady } = useWorkspaceAdminRoute()
  const { data: user } = useGetUserData()

  if (!isReady) {
    return (
      <AdminLayout>
        <SpinnerFrame>
          <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
        </SpinnerFrame>
      </AdminLayout>
    )
  }

  if (!resolvedWorkspace) {
    if (typeof window !== "undefined") router.replace("/workspaces")

    return null
  }

  if (!user?.user) return null

  return (
    <AdminLayout>
      <MembersPageContent initialWorkspace={resolvedWorkspace} />
    </AdminLayout>
  )
}
