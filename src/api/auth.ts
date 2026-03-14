import supabase from "@/lib/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

  return useMutation({
    mutationFn: (data: { email: string; password: string }) => postSignIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userData"] })
      toast.success("정상적으로 로그인 되었습니다.")
      router.push("/")
    },
    onError: () => {
      toast.error("이메일 또는 비밀번호가 다릅니다.")
    },
  })
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

  return useMutation({
    mutationFn: postSignOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userData"] })
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
  const { data, isLoading } = useQuery({
    queryKey: ["userData"],
    queryFn: getUserData,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5,
  })

  return { data, isLoading }
}

// Session (includes access_token for API calls)
const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)

  return data.session
}

export const useSession = () => {
  return useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}

export type WorkspaceItem = {
  id: string
  name: string
  account_type: string
}

const fetchMyWorkspaces = async (): Promise<WorkspaceItem[]> => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return []
  const res = await fetch("/api/me/workspaces", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const json = await res.json()

  return Array.isArray(json) ? json : []
}

export const useMyWorkspaces = () => {
  return useQuery({
    queryKey: ["myWorkspaces"],
    queryFn: fetchMyWorkspaces,
    staleTime: 1000 * 60 * 2,
  })
}

export type SignupStatus = {
  id: string
  status: string
  created_at: string
} | null

const fetchMySignupStatus = async (): Promise<SignupStatus> => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null
  const res = await fetch("/api/me/signup-status", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const json = await res.json()

  return json ?? null
}

export const useMySignupStatus = () => {
  return useQuery({
    queryKey: ["mySignupStatus"],
    queryFn: fetchMySignupStatus,
    staleTime: 1000 * 60 * 2,
  })
}
