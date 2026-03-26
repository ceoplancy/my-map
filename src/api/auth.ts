import type { MyWorkspaceItem } from "@/types/db"
import supabase from "@/lib/supabase/supabaseClient"
import { useRouter } from "next/router"
import { toast } from "react-toastify"
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from "@tanstack/react-query"
import { QUERY_KEYS } from "@/constants/query-keys"
import { ROUTES } from "@/constants/routes"
import { getJsonWithBearerIfOk } from "@/lib/apiClient"
import { fetchAuth, type AuthSnapshot } from "@/lib/auth/clientAuth"
import { reportError } from "@/lib/reportError"

const LOGGED_OUT_AUTH_SNAPSHOT: AuthSnapshot = {
  user: null,
  session: null,
}

/**
 * supabase.signOut() 직후에도 React Query에 이전 user/session이 남으면
 * (invalidate refetch 전) 지도 페이지 등이 로그인 사용자로 오판 → /workspaces 로 보낼 수 있음.
 */
function applyLoggedOutClientState(queryClient: QueryClient) {
  queryClient.setQueryData(QUERY_KEYS.auth, LOGGED_OUT_AUTH_SNAPSHOT)
  queryClient.setQueryData<MyWorkspaceItem[]>(["myWorkspaces"], [])
  queryClient.setQueryData(["adminStatus"], { isServiceAdmin: false })
  queryClient.setQueryData(["mySignupStatus"], null)
}

function invalidateAuthCaches(
  queryClient: QueryClient,
  options: { includeSignupStatus: boolean },
) {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth })
  void queryClient.invalidateQueries({ queryKey: ["myWorkspaces"] })
  void queryClient.invalidateQueries({ queryKey: ["adminStatus"] })
  if (options.includeSignupStatus) {
    void queryClient.invalidateQueries({ queryKey: ["mySignupStatus"] })
  }
}

/** 로그아웃 성공 시: 캐시 즉시 비움 + 서버와 재동기화 */
function afterSignOutSuccess(queryClient: QueryClient) {
  applyLoggedOutClientState(queryClient)
  invalidateAuthCaches(queryClient, { includeSignupStatus: true })
}

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
      invalidateAuthCaches(queryClient, { includeSignupStatus: false })
      toast.success("정상적으로 로그인 되었습니다.")
      router.push(ROUTES.workspaces)
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
      afterSignOutSuccess(queryClient)
      toast.success("정상적으로 로그아웃 되었습니다.")
      router.replace(ROUTES.signIn)
    },
    onError: () => {
      toast.error(
        "네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
      )
    },
  })
}

// =========================================
// ============== Auth (단일 Query: user + session)
// =========================================

const authQueryOptions = {
  queryKey: QUERY_KEYS.auth,
  queryFn: fetchAuth,
  retry: 1,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  staleTime: 1000 * 60 * 5,
} as const

export type UseAuthQueryResult = UseQueryResult<
  Awaited<ReturnType<typeof fetchAuth>>,
  Error
>

/** 내부 공용 — user·session 동일 캐시 */
export function useAuthQuery(): UseAuthQueryResult {
  return useQuery(authQueryOptions)
}

/** `user` + `session` 편의 필드 */
export function useAuth() {
  const q = useAuthQuery()

  return {
    ...q,
    user: q.data?.user ?? null,
    session: q.data?.session ?? null,
  }
}

/** 기존: `getUser()` 형태 `{ user }` — 동일 캐시 */
export const useGetUserData = () => {
  const q = useAuthQuery()

  return {
    data: q.data !== undefined ? { user: q.data.user } : undefined,
    isLoading: q.isLoading,
  }
}

/** 기존: `session`만 — 동일 캐시 */
export const useSession = () => {
  const q = useAuthQuery()

  return {
    ...q,
    data: q.data?.session ?? undefined,
  }
}

/** @deprecated Use MyWorkspaceItem from @/types/db */
export type WorkspaceItem = MyWorkspaceItem

const fetchMyWorkspaces = async (): Promise<MyWorkspaceItem[]> => {
  const json = await getJsonWithBearerIfOk<unknown>("/api/me/workspaces")
  if (json === null) return []

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
  const json = await getJsonWithBearerIfOk<{ isServiceAdmin?: boolean }>(
    "/api/me/admin-status",
  )
  if (json === null) return { isServiceAdmin: false }

  return {
    isServiceAdmin: Boolean(json.isServiceAdmin),
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
  const json = await getJsonWithBearerIfOk<SignupStatus>(
    "/api/me/signup-status",
  )

  return json ?? null
}

export const useMySignupStatus = () => {
  return useQuery({
    queryKey: ["mySignupStatus"],
    queryFn: fetchMySignupStatus,
    staleTime: 1000 * 60 * 2,
  })
}

export { fetchAuth, getAccessToken } from "@/lib/auth/clientAuth"
