import supabase from "@/lib/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useQuery, useMutation, useQueryClient } from "react-query"
import * as Sentry from "@sentry/nextjs"
// =========================================
// ============== post sign in
// =========================================
const postSignIn = async (data: { email: string; password: string }) => {
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    Sentry.captureException(error)
    Sentry.captureMessage("로그인에 실패했습니다.")
    throw new Error(error.message)
  }
}

export const usePostSignIn = () => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation(
    (data: { email: string; password: string }) => postSignIn(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["userData"])

        toast.success("정상적으로 로그인 되었습니다.")
        router.push("/")
      },

      onError: () => {
        toast.error("이메일 또는 비밀번호가 다릅니다.")
      },
    },
  )
}

// =========================================
// ============== post sign out
// =========================================
const postSignOut = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    Sentry.captureException(error)
    Sentry.captureMessage("로그아웃에 실패했습니다.")
    throw new Error(error.message)
  }
}

export const usePostSignOut = () => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation(() => postSignOut(), {
    onSuccess: () => {
      queryClient.invalidateQueries(["userData"])
      toast.success("정상적으로 로그아웃 되었습니다.")
      router.push("/")
    },

    onError: () => {
      toast.error(
        "네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
      )
    },
  })
}

// =========================================
// ============== get user data
// =========================================
const getUserData = async () => {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    Sentry.captureException(error)
    Sentry.captureMessage("사용자 정보 조회에 실패했습니다.")
    throw new Error(error.message)
  }

  Sentry.setUser({
    email: data.user?.email,
    id: data.user?.id,
    metadata: data.user?.user_metadata,
  })

  return data
}

export const useGetUserData = () => {
  const { data, isLoading } = useQuery(["userData"], getUserData, {
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
    staleTime: 1000 * 60 * 5,
  })

  return { data, isLoading }
}
