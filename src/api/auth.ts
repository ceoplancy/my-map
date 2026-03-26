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
 * 로그아웃 직후: auth 캐시를 비로그인으로 고정하고 의존 쿼리 캐시를 제거한다.
 * invalidate만 하면 refetch가 백그라운드에서 이전 세션으로 레이스할 수 있음.
 */
function finalizeClientSignOut(queryClient: QueryClient) {
  queryClient.setQueryData(QUERY_KEYS.auth, LOGGED_OUT_AUTH_SNAPSHOT)
  queryClient.removeQueries({ queryKey: QUERY_KEYS.myWorkspaces })
  queryClient.removeQueries({ queryKey: QUERY_KEYS.adminStatus })
  queryClient.removeQueries({ queryKey: QUERY_KEYS.mySignupStatus })
}

// =========================================
// ============== post sign in / sign out (mutationFn only)
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

const postSignOut = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    reportError(error)
    throw new Error(error.message)
  }
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

export const fetchMyWorkspaces = async (): Promise<MyWorkspaceItem[]> => {
  const json = await getJsonWithBearerIfOk<unknown>("/api/me/workspaces")
  if (json === null) return []

  return Array.isArray(json) ? (json as MyWorkspaceItem[]) : []
}

export type UseMyWorkspacesOptions = { enabled?: boolean }

export const useMyWorkspaces = (options?: UseMyWorkspacesOptions) => {
  return useQuery({
    queryKey: QUERY_KEYS.myWorkspaces,
    queryFn: fetchMyWorkspaces,
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  })
}

/** 통합 관리자(service_admin) 여부 — 통합 관리 메뉴/API 접근 권한 */
export const fetchAdminStatus = async (): Promise<{
  isServiceAdmin: boolean
}> => {
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
    queryKey: QUERY_KEYS.adminStatus,
    queryFn: fetchAdminStatus,
    staleTime: 1000 * 60 * 2,
  })
}

export type SignupStatus = {
  id: string
  status: string
  created_at: string
} | null

export const fetchMySignupStatus = async (): Promise<SignupStatus> => {
  const json = await getJsonWithBearerIfOk<SignupStatus>(
    "/api/me/signup-status",
  )

  return json ?? null
}

export const useMySignupStatus = () => {
  return useQuery({
    queryKey: QUERY_KEYS.mySignupStatus,
    queryFn: fetchMySignupStatus,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * 로그인 성공 직후: 캐시를 확정한 뒤에만 라우팅(워크스페이스 가드 레이스 방지).
 * 순차 fetchQuery는 왕복 시간이 합산되어 느려지므로 병렬 처리한다.
 */
async function syncSessionAfterSignIn(queryClient: QueryClient) {
  await Promise.all([
    queryClient.fetchQuery({
      queryKey: QUERY_KEYS.auth,
      queryFn: fetchAuth,
    }),
    queryClient.fetchQuery({
      queryKey: QUERY_KEYS.myWorkspaces,
      queryFn: fetchMyWorkspaces,
    }),
    queryClient.fetchQuery({
      queryKey: QUERY_KEYS.adminStatus,
      queryFn: fetchAdminStatus,
    }),
    queryClient.fetchQuery({
      queryKey: QUERY_KEYS.mySignupStatus,
      queryFn: fetchMySignupStatus,
    }),
  ])
}

export const usePostSignIn = () => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { email: string; password: string }) => postSignIn(data),
    onSuccess: async () => {
      await syncSessionAfterSignIn(queryClient)
      toast.success("정상적으로 로그인 되었습니다.")
      await router.push(ROUTES.workspaces)
    },
    onError: () => {
      toast.error("이메일 또는 비밀번호가 다릅니다.")
    },
  })
}

export const usePostSignOut = () => {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: postSignOut,
    onSuccess: async () => {
      finalizeClientSignOut(queryClient)
      toast.success("정상적으로 로그아웃 되었습니다.")
      await router.replace(ROUTES.signIn)
    },
    onError: () => {
      toast.error(
        "네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
      )
    },
  })
}

export { fetchAuth, getAccessToken } from "@/lib/auth/clientAuth"
