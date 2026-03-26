import type { User } from "@supabase/supabase-js"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"

import type { AuthRole } from "@/types/auth"
import type { AccountType, AdminWorkspaceItem } from "@/types/db"

export type { AdminWorkspaceItem }
import supabase from "@/lib/supabase/supabaseClient"
import { apiErrorMessageFromBody } from "@/lib/apiErrorMessage"
import { QUERY_KEYS } from "@/constants/query-keys"
import { shouldReportSentryForHttpStatus } from "@/lib/httpReporting"
import { reportError, reportMessage } from "@/lib/reportError"

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

async function getAdminAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error("Unauthorized")

  return { Authorization: `Bearer ${session.access_token}` }
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
  const headers = await getAdminAuthHeaders()
  const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, {
    headers,
  })
  if (!res.ok) {
    const msg = await res.text()
    if (shouldReportSentryForHttpStatus(res.status)) {
      reportMessage("사용자 목록 조회에 실패했습니다.", "error")
    }
    throw new Error(msg || res.statusText)
  }

  return res.json() as Promise<GetUsersResponse>
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
  const headers = await getAdminAuthHeaders()
  const res = await fetch(`/api/admin/users/${userId}`, { headers })
  if (!res.ok) {
    const msg = await res.text()
    if (shouldReportSentryForHttpStatus(res.status)) {
      reportMessage("사용자 조회에 실패했습니다.", "error")
    }
    throw new Error(msg || res.statusText)
  }

  return res.json()
}

// 사용자 생성 (서버 API 경유)
const createUser = async (
  email: string,
  password: string,
  userData?: object,
) => {
  const headers = await getAdminAuthHeaders()
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, userData }),
  })
  if (!res.ok) {
    const msg = await res.text()
    if (shouldReportSentryForHttpStatus(res.status)) {
      reportMessage("사용자 생성에 실패했습니다.", "error")
    }
    throw new Error(msg || res.statusText)
  }

  return res.json()
}

// 사용자 정보 수정 (서버 API 경유)
const updateUser = async (userId: string, updates: object) => {
  const headers = await getAdminAuthHeaders()
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const msg = await res.text()
    if (shouldReportSentryForHttpStatus(res.status)) {
      reportMessage("사용자 정보 수정에 실패했습니다.", "error")
    }
    throw new Error(msg || res.statusText)
  }

  return res.json()
}

// 사용자 삭제 (서버 API 경유)
const deleteUser = async (userId: string) => {
  const headers = await getAdminAuthHeaders()
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
    headers,
  })
  if (!res.ok) {
    const msg = await res.text()
    if (shouldReportSentryForHttpStatus(res.status)) {
      reportMessage("사용자 삭제에 실패했습니다.", "error")
    }
    throw new Error(msg || res.statusText)
  }
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
  const headers = await getAdminAuthHeaders()
  const res = await fetch(`/api/admin/users/${userId}/workspaces`, {
    headers,
  })
  if (!res.ok) {
    const msg = await res.text()
    if (shouldReportSentryForHttpStatus(res.status)) {
      reportMessage("사용자 워크스페이스 목록 조회에 실패했습니다.", "error")
    }
    throw new Error(msg || res.statusText)
  }
  const json = await res.json()

  return Array.isArray(json) ? json : []
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
  const headers = await getAdminAuthHeaders()
  const res = await fetch(`/api/admin/users/${userId}/workspaces`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, role }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(
      apiErrorMessageFromBody(err, res.statusText || "Request failed"),
    )
  }
}

const removeAdminUserWorkspace = async (
  userId: string,
  workspaceId: string,
) => {
  const headers = await getAdminAuthHeaders()
  const res = await fetch(
    `/api/admin/users/${userId}/workspaces?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: "DELETE", headers },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(
      apiErrorMessageFromBody(err, res.statusText || "Request failed"),
    )
  }
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
  const headers = await getAdminAuthHeaders()
  const res = await fetch("/api/admin/workspaces", { headers })
  if (!res.ok) {
    const msg = await res.text()
    if (shouldReportSentryForHttpStatus(res.status)) {
      reportMessage("관리자 워크스페이스 목록 조회에 실패했습니다.", "error")
    }
    throw new Error(msg || res.statusText)
  }
  const json = await res.json()

  return Array.isArray(json) ? json : []
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
  const headers = await getAdminAuthHeaders()
  const res = await fetch("/api/admin/workspaces", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await res.text()
    if (shouldReportSentryForHttpStatus(res.status)) {
      reportMessage("워크스페이스 생성에 실패했습니다.", "error")
    }
    throw new Error(msg || res.statusText)
  }

  return res.json() as Promise<AdminWorkspaceItem>
}

export const useCreateAdminWorkspace = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAdminWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWorkspaces"] })
      queryClient.invalidateQueries({ queryKey: ["myWorkspaces"] })
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
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ user_metadata: { role } }),
    })
    if (!res.ok) throw new Error(await res.text())

    return { success: true }
  } catch (error) {
    reportError(error, { toastMessage: "사용자 권한 설정에 실패했습니다." })

    return { success: false, error }
  }
}
