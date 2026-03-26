import type { User } from "@supabase/supabase-js"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"

import type { AuthRole } from "@/types/auth"
import type { AccountType, AdminWorkspaceItem } from "@/types/db"
import supabase from "@/lib/supabase/supabaseClient"
import type { AxiosResponse } from "axios"

import {
  apiClient,
  bearerHeaders,
  isHttpOk,
  responseBodyAsErrorText,
  throwApiErrorFromHttpResponse,
  throwHttpTextError,
} from "@/lib/apiClient"
import { getAccessToken } from "@/lib/auth/clientAuth"
import { QUERY_KEYS } from "@/constants/query-keys"
import { shouldReportSentryForHttpStatus } from "@/lib/httpReporting"
import { reportError, reportMessage } from "@/lib/reportError"

export type { AdminWorkspaceItem }

// =======================================
// ============== get 필터 메뉴 ================
// =======================================
const getFilterMenu = async () => {
  const { data: statusData, error: statusError } = await supabase.rpc(
    "get_distinct_status",
  ) // 저장 프로시저 사용

  const { data: companyData, error: companyError } = await supabase.rpc(
    "get_distinct_company",
  ) // 저장 프로시저 사용

  if (statusError || companyError)
    throw new Error(statusError?.message || companyError?.message)

  type StatusRow = { status: string }
  type CompanyRow = { company: string }

  const statusRows = (statusData ?? []) as StatusRow[]
  const companyRows = (companyData ?? []) as CompanyRow[]

  // 중복 제거를 클라이언트에서 처리
  const uniqueStatus = [...new Set(statusRows.map((item) => item.status))]
  const uniqueCompany = [...new Set(companyRows.map((item) => item.company))]

  return {
    statusMenu: uniqueStatus,
    companyMenu: uniqueCompany,
  }
}

export const useGetFilterMenu = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true

  return useQuery({
    queryKey: QUERY_KEYS.filterMenu,
    queryFn: getFilterMenu,
    enabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5,
  })
}

// =======================================
// ============== 사용자 관리 기능 ===============
// =======================================

async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  if (!token) throw new Error("Unauthorized")

  return bearerHeaders(token)
}

/** 관리자 API: 2xx면 `data`, 아니면 Sentry(옵션) 후 throw */
async function adminJsonOrThrow<T>(
  request: (_headers: Record<string, string>) => Promise<AxiosResponse<T>>,
  sentryMessage?: string,
): Promise<T> {
  const headers = await getAdminAuthHeaders()
  const res = await request(headers)
  if (!isHttpOk(res.status)) {
    const msg = responseBodyAsErrorText(res)
    if (sentryMessage && shouldReportSentryForHttpStatus(res.status)) {
      reportMessage(sentryMessage, "error")
    }
    throw new Error(msg || res.statusText)
  }

  return res.data
}

async function adminMutationOrThrowApiError(
  request: (
    _headers: Record<string, string>,
  ) => Promise<AxiosResponse<unknown>>,
): Promise<void> {
  const headers = await getAdminAuthHeaders()
  const res = await request(headers)
  if (!isHttpOk(res.status)) {
    throwApiErrorFromHttpResponse(res, res.statusText || "Request failed")
  }
}

export type GetUsersResponse = {
  users: User[]
  metadata: {
    currentPage: number
    perPage: number
    totalCount: number
    totalPages: number
    hasMore: boolean
  }
}

// 페이지네이션이 적용된 사용자 목록 조회 (서버 API 경유)
const getUsers = async (
  page: number = 1,
  limit: number = 10,
): Promise<GetUsersResponse> => {
  return adminJsonOrThrow(
    (headers) =>
      apiClient.get<GetUsersResponse>(
        `/api/admin/users?page=${page}&limit=${limit}`,
        { headers },
      ),
    "사용자 목록 조회에 실패했습니다.",
  )
}

export const useGetUsers = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ["users", page, limit],
    queryFn: () => getUsers(page, limit),
    placeholderData: (prev) => prev,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
}

// 특정 사용자 조회 (서버 API 경유)
const getUser = async (userId: string) => {
  return adminJsonOrThrow(
    (headers) => apiClient.get(`/api/admin/users/${userId}`, { headers }),
    "사용자 조회에 실패했습니다.",
  )
}

// 사용자 생성 (서버 API 경유)
const createUser = async (
  email: string,
  password: string,
  userData?: object,
) => {
  return adminJsonOrThrow(
    (headers) =>
      apiClient.post(
        "/api/admin/users",
        { email, password, userData },
        {
          headers,
        },
      ),
    "사용자 생성에 실패했습니다.",
  )
}

// 사용자 정보 수정 (서버 API 경유)
const updateUser = async (userId: string, updates: object) => {
  return adminJsonOrThrow(
    (headers) =>
      apiClient.patch(`/api/admin/users/${userId}`, updates, { headers }),
    "사용자 정보 수정에 실패했습니다.",
  )
}

// 사용자 삭제 (서버 API 경유)
const deleteUser = async (userId: string) => {
  await adminJsonOrThrow(
    (headers) => apiClient.delete(`/api/admin/users/${userId}`, { headers }),
    "사용자 삭제에 실패했습니다.",
  )
}

export const useGetUser = (userId: string) => {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      email,
      password,
      userData,
    }: {
      email: string
      password: string
      userData?: object
    }) => createUser(email, password, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("사용자가 성공적으로 생성되었습니다.")
    },
    onError: () => {
      toast.error(
        "사용자 생성에 실패했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
      )
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: object }) =>
      updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["user"] })
      toast.success("사용자 정보가 성공적으로 수정되었습니다.")
    },
    onError: () => {
      toast.error(
        "사용자 정보 수정에 실패했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
      )
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("사용자가 성공적으로 삭제되었습니다.")
    },
    onError: () => {
      toast.error(
        "사용자 삭제에 실패했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
      )
    },
  })
}

// =======================================
// ============== 사용자 워크스페이스 권한 (통합 관리 ↔ 워크스페이스 사용자 관리 연동) ===============
// =======================================

export type UserWorkspaceMembership = {
  workspaceId: string
  workspaceName: string
  role: string
  memberId: string
}

const getAdminUserWorkspaces = async (
  userId: string,
): Promise<UserWorkspaceMembership[]> => {
  const data = await adminJsonOrThrow(
    (headers) =>
      apiClient.get(`/api/admin/users/${userId}/workspaces`, { headers }),
    "사용자 워크스페이스 목록 조회에 실패했습니다.",
  )

  return Array.isArray(data) ? data : []
}

export const useAdminUserWorkspaces = (userId: string | null) => {
  return useQuery({
    queryKey: ["adminUserWorkspaces", userId],
    queryFn: () => getAdminUserWorkspaces(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60,
  })
}

type AssignableWorkspaceRole = "top_admin" | "admin" | "field_agent"

const addOrUpdateAdminUserWorkspace = async (
  userId: string,
  workspaceId: string,
  role: AssignableWorkspaceRole,
) => {
  await adminMutationOrThrowApiError((headers) =>
    apiClient.post(
      `/api/admin/users/${userId}/workspaces`,
      { workspaceId, role },
      { headers },
    ),
  )
}

const removeAdminUserWorkspace = async (
  userId: string,
  workspaceId: string,
) => {
  await adminMutationOrThrowApiError((headers) =>
    apiClient.delete(
      `/api/admin/users/${userId}/workspaces?workspaceId=${encodeURIComponent(workspaceId)}`,
      { headers },
    ),
  )
}

export const useAddOrUpdateAdminUserWorkspace = (userId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      role,
    }: {
      workspaceId: string
      role: AssignableWorkspaceRole
    }) => addOrUpdateAdminUserWorkspace(userId, workspaceId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["adminUserWorkspaces", userId],
      })
      queryClient.invalidateQueries({
        queryKey: ["workspaceMembersWithUsers", variables.workspaceId],
      })
      toast.success("워크스페이스 권한이 반영되었습니다.")
    },
    onError: (e: Error) => {
      toast.error(e.message || "워크스페이스 권한 설정에 실패했습니다.")
    },
  })
}

export const useRemoveAdminUserWorkspace = (userId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workspaceId: string) =>
      removeAdminUserWorkspace(userId, workspaceId),
    onSuccess: (workspaceId) => {
      queryClient.invalidateQueries({
        queryKey: ["adminUserWorkspaces", userId],
      })
      queryClient.invalidateQueries({
        queryKey: ["workspaceMembersWithUsers", workspaceId],
      })
      toast.success("워크스페이스에서 제거되었습니다.")
    },
    onError: (e: Error) => {
      toast.error(e.message || "워크스페이스 제거에 실패했습니다.")
    },
  })
}

// =======================================
// ============== 관리자 워크스페이스 ===============
// =======================================

const getAdminWorkspaces = async (): Promise<AdminWorkspaceItem[]> => {
  const data = await adminJsonOrThrow(
    (headers) => apiClient.get("/api/admin/workspaces", { headers }),
    "관리자 워크스페이스 목록 조회에 실패했습니다.",
  )

  return Array.isArray(data) ? data : []
}

export const useAdminWorkspaces = () => {
  return useQuery({
    queryKey: ["adminWorkspaces"],
    queryFn: getAdminWorkspaces,
    staleTime: 1000 * 60 * 2,
  })
}

const createAdminWorkspace = async (payload: {
  name: string
  account_type: AccountType
}): Promise<AdminWorkspaceItem> => {
  return adminJsonOrThrow(
    (headers) =>
      apiClient.post<AdminWorkspaceItem>("/api/admin/workspaces", payload, {
        headers,
      }),
    "워크스페이스 생성에 실패했습니다.",
  )
}

export const useCreateAdminWorkspace = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAdminWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWorkspaces"] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myWorkspaces })
      toast.success("워크스페이스가 생성되었습니다.")
    },
    onError: () => {
      toast.error("워크스페이스 생성에 실패했습니다.")
    },
  })
}

// 사용자 권한 설정 (서버 API 경유, user_metadata.role)
export const setUserRole = async (
  userId: string,
  role: AuthRole,
): Promise<{ success: boolean; error?: unknown }> => {
  try {
    const headers = await getAdminAuthHeaders()
    const res = await apiClient.patch(
      `/api/admin/users/${userId}`,
      { user_metadata: { role } },
      { headers },
    )
    if (!isHttpOk(res.status)) {
      throwHttpTextError(res, res.statusText)
    }

    return { success: true }
  } catch (error) {
    reportError(error, { toastMessage: "사용자 권한 설정에 실패했습니다." })

    return { success: false, error }
  }
}
