import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { QUERY_KEYS } from "@/constants/query-keys"
import supabase from "@/lib/supabase/supabaseClient"

/**
 * 로그인/로그아웃/토큰 갱신 시 `QUERY_KEYS.auth` 한 번에 무효화해
 * useGetUserData / useSession 이 같은 데이터를 보도록 합니다.
 */
export function AuthStateSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // `SIGNED_IN`은 `usePostSignIn`의 `syncSessionAfterSignIn`이 이미 fetchQuery로 캐시를 채운 뒤에도
      // 비동기로 올 수 있어, 여기서 즉시 invalidate하면 auth refetch와 레이스가 난다.
      // 비밀번호 로그인 플로우는 mutation 쪽에서 캐시를 확정한다.
      if (event === "SIGNED_IN") return

      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth })
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  return null
}
