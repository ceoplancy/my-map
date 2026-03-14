import { useEffect } from "react"
import { useRouter } from "next/router"
import { FullPageLoader } from "@/components/FullPageLoader"

/** 가입 승인은 서비스 관리자 패널(통합 관리)에서만 수행. 이 경로는 리다이렉트. */
export default function WorkspaceAdminSignupRequestsPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined") {
      router.replace("/admin/signup-requests")
    }
  }, [router])

  return <FullPageLoader message="이동 중..." />
}
