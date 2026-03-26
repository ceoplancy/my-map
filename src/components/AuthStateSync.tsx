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
    } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth })
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  return null
}
