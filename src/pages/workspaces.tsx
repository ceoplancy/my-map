import dynamic from "next/dynamic"
import Head from "next/head"
import { FullPageLoader } from "@/components/FullPageLoader"

/**
 * zustand persist + React Query + 로그인 직후 세션은 브라우저 전용.
 * SSR에서 실행하면 dev(Turbopack)에서 간헐적 500·빈 목록이 나기 쉬우므로 클라이언트만 렌더한다.
 */
const WorkspacesPageContent = dynamic(
  () =>
    import("@/components/workspaces/WorkspacesPageContent").then(
      (m) => m.WorkspacesPageContent,
    ),
  {
    ssr: false,
    loading: () => (
      <>
        <Head>
          <title>워크스페이스 선택 | ANT:RE</title>
        </Head>
        <FullPageLoader message="워크스페이스 목록을 불러오는 중..." />
      </>
    ),
  },
)

export default function WorkspacesPage() {
  return <WorkspacesPageContent />
}
