import type { User } from "@supabase/supabase-js"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"

import type { AuthRole } from "@/types/auth"
import type { AccountType, AdminWorkspaceItem } from "@/types/db"

export type { AdminWorkspaceItem }
import supabase from "@/lib/supabase/supabaseClient"
import { getCoordinateRanges } from "@/lib/utils"
import { FilterParams } from "@/types"
import { Excel } from "@/types/excel"
import { reportError, reportMessage } from "@/lib/reportError"

// =======================================
// ============== get 엑셀 데이터 ===============
// =======================================
const getExcel = async (mapLevel = 14, params?: FilterParams) => {
  let query = supabase.from("excel").select("*", { count: "exact" })

  if (params?.userMetadata) {
    const { allowedStatus, allowedCompany, role } = params.userMetadata
    const isAdmin = role.includes("admin")

    // 허용된 상태 필터링
    if (allowedStatus?.length > 0) {
      query = query.in("status", allowedStatus)
    }

    // 허용된 회사 필터링
    if (allowedCompany?.length > 0) {
      query = query.in("company", allowedCompany)
    }

    // 사용자가 선택한 필터가 허용된 범위 내인지 확인
    if (params.status && params.status.length > 0) {
      if (!isAdmin) {
        const validStatuses = params.status.filter((s) =>
          allowedStatus?.includes(s),
        )
        if (validStatuses.length > 0) {
          query = query.in("status", validStatuses)
        }
      } else {
        query = query.in("status", params.status)
      }
    }

    if (params.company && params.company.length > 0) {
      if (!isAdmin) {
        const validCompanies = params.company.filter((c) =>
          allowedCompany?.includes(c),
        )
        if (validCompanies.length > 0) {
          query = query.in("company", validCompanies)
        }
      } else {
        query = query.in("company", params.company)
      }
    }
  }

  // 공통 필터 적용
  if (params?.city && params.city.length > 0) {
    query = query.like("address", `%${params.city}%`)
  }

  // 스톡 필터링 로직 수정
  if (params?.stocks && params.stocks.length > 0) {
    // OR 조건으로 각 구간 필터링
    const stockConditions = params.stocks
      .map((range) => `and(stocks.gte.${range.start},stocks.lte.${range.end})`)
      .join(",")

    query = query.or(stockConditions)
  }

  // 위도, 경도 필터링
  if (params?.lat && params?.lng) {
    const { latRange, lngRange } = getCoordinateRanges(mapLevel)

    query = query.gte("lat", params.lat - latRange)
    query = query.lte("lat", params.lat + latRange)
    query = query.gte("lng", params.lng - lngRange)
    query = query.lte("lng", params.lng + lngRange)
  }

  const { data, error } = await query

  if (error) {
    reportError(error, { toastMessage: "엑셀 데이터 조회에 실패했습니다." })
    throw new Error(error.message)
  }

  return data
}

export const useGetExcel = (mapLevel: number, params?: FilterParams) => {
  const queryKey = [
    "excel",
    mapLevel,
    params?.company,
    params?.status,
    params?.stocks,
    params?.city,
    params?.userMetadata,
  ]

  return useQuery({
    queryKey,
    queryFn: () => getExcel(mapLevel, params),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

// =========================================
// ============== patch 마커 정보 업데이트 ============
// =========================================
const updateExcel = async (patchData: Excel) => {
  const { id, ...attributes } = patchData
  const { error } = await supabase
    .from("excel")
    .update(attributes)
    .eq("id", id)
    .select()

  if (error) {
    reportError(error, { toastMessage: "엑셀 데이터 수정에 실패했습니다." })
    throw new Error(error.message)
  }
}

export const usePatchExcel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patchData: Excel) => updateExcel(patchData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excel"] })
      queryClient.invalidateQueries({ queryKey: ["filteredStats"] })
    },
    onError: () => {
      toast.error(
        "네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
      )
    },
  })
}

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

  // 중복 제거를 클라이언트에서 처리
  const uniqueStatus = [...new Set(statusData.map((item) => item.status))]
  const uniqueCompany = [...new Set(companyData.map((item) => item.company))]

  return {
    statusMenu: uniqueStatus,
    companyMenu: uniqueCompany,
  }
}

export const useGetFilterMenu = () => {
  return useQuery({
    queryKey: ["filterMenu"],
    queryFn: getFilterMenu,
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
    reportMessage("사용자 목록 조회에 실패했습니다.", "error")
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
    reportMessage("사용자 조회에 실패했습니다.", "error")
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
    reportMessage("사용자 생성에 실패했습니다.", "error")
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
    reportMessage("사용자 정보 수정에 실패했습니다.", "error")
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
    reportMessage("사용자 삭제에 실패했습니다.", "error")
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
// ============== 관리자 워크스페이스 ===============
// =======================================

const getAdminWorkspaces = async (): Promise<AdminWorkspaceItem[]> => {
  const headers = await getAdminAuthHeaders()
  const res = await fetch("/api/admin/workspaces", { headers })
  if (!res.ok) {
    const msg = await res.text()
    reportMessage("관리자 워크스페이스 목록 조회에 실패했습니다.", "error")
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
    reportMessage("워크스페이스 생성에 실패했습니다.", "error")
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

export const useDeleteExcel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("excel").delete().eq("id", id)

      if (error) throw error

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excel"] })
    },
  })
}
