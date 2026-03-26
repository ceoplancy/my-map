import type { MyWorkspaceItem } from "@/types/db"
import supabase from "@/lib/supabase/supabaseClient"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as Sentry from "@sentry/nextjs"
import { reportError } from "@/lib/reportError"
// =========================================
// ============== post sign in
// =========================================
const isBenignSignInError = (error: { message?: string; code?: string }) =>
  error.message?.includes("Invalid login credentials") === true ||
  error.code === "invalid_credentials"

const postSignIn = async (data: { email: string; password: string }) => {
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    if (!isBenignSignInError(error)) {
      reportError(error)
    }
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
      queryClient.invalidateQueries({ queryKey: ["myWorkspaces"] })
      queryClient.invalidateQueries({ queryKey: ["adminStatus"] })
      toast.success("정상적으로 로그인 되었습니다.")
      router.push("/workspaces")
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
    reportError(error)
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
    reportError(error)
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

/** @deprecated Use MyWorkspaceItem from @/types/db */
export type WorkspaceItem = MyWorkspaceItem

const fetchMyWorkspaces = async (): Promise<MyWorkspaceItem[]> => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return []
  const res = await fetch("/api/me/workspaces", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const json = await res.json()

  return Array.isArray(json) ? (json as MyWorkspaceItem[]) : []
}

export type UseMyWorkspacesOptions = { enabled?: boolean }

export const useMyWorkspaces = (options?: UseMyWorkspacesOptions) => {
  return useQuery({
    queryKey: ["myWorkspaces"],
    queryFn: fetchMyWorkspaces,
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  })
}

/** 통합 관리자(service_admin) 여부 — 통합 관리 메뉴/API 접근 권한 */
const fetchAdminStatus = async (): Promise<{ isServiceAdmin: boolean }> => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { isServiceAdmin: false }
  const res = await fetch("/api/me/admin-status", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { isServiceAdmin: false }
  const json = await res.json()

  return {
    isServiceAdmin: Boolean(json?.isServiceAdmin),
  }
}

export const useAdminStatus = () => {
  return useQuery({
    queryKey: ["adminStatus"],
    queryFn: fetchAdminStatus,
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
