import supabase from "@/lib/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useQuery, useMutation, useQueryClient } from "react-query"

// =========================================
// ============== post sign in
// =========================================
const postSignIn = async (data: { email: string; password: string }) => {
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) throw new Error(error.message)
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

  if (error) throw new Error(error.message)
}

export const usePostSignOut = () => {
  const queryClient = useQueryClient()

  return useMutation(() => postSignOut(), {
    onSuccess: () => {
      queryClient.invalidateQueries(["userData"])
      toast.success("정상적으로 로그아웃 되었습니다.")
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

  if (error) throw new Error(error.message)

  return data
}

export const useGetUserData = (redirect = true) => {
  const router = useRouter()

  return useQuery(["userData"], () => getUserData(), {
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
    staleTime: 1000 * 60 * 5,

    onError: () => {
      if (redirect) {
        toast.error("로그인 후 이용해 주세요.")
        router.push("/sign-in")
      }
    },
  })
}
