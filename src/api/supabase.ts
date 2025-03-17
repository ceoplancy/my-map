import { useQuery, useMutation, useQueryClient } from "react-query"
import { toast } from "react-toastify"

import supabase from "@/lib/supabase/supabaseClient"
import supabaseAdmin from "@/lib/supabase/supabaseAdminClient"
import { getCoordinateRanges } from "@/lib/utils"
import { FilterParams } from "@/types"
import { Excel } from "@/types/excel"

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

  if (error) throw new Error(error.message)

  return data
}

export const useGetExcel = (mapLevel: number, params?: FilterParams) => {
  const queryKey = [
    "excel",
    params?.status,
    params?.company,
    params?.city,
    params?.stocks,
    params?.userMetadata,
  ]

  return useQuery(queryKey, () => getExcel(mapLevel, params), {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
    staleTime: 60000, // 1분 동안 캐시된 데이터 사용
    cacheTime: 300000, // 5분 동안 캐시 유지
    onError: () => {
      toast.error(
        "네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
      )
    },
  })
}

// =========================================
// ============== patch 마커 정보 업데이트 ============
// =========================================
const updateExcel = async (excelId: number, patchData: Excel) => {
  const { error } = await supabase
    .from("excel")
    .update(patchData)
    .eq("id", excelId)
    .select()

  if (error) throw new Error(error.message)
}

export const usePatchExcel = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, patchData }: { id: number; patchData: Excel }) =>
      updateExcel(id, patchData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["excel"])
        queryClient.invalidateQueries(["filteredStats"])
      },
      onError: () => {
        toast.error(
          "네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
        )
      },
    },
  )
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
  return useQuery(["filterMenu"], () => getFilterMenu(), {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
    staleTime: 1000 * 60 * 5,
    onError: () => {
      toast.error(
        "네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
      )
    },
  })
}

// =======================================
// ============== 사용자 관리 기능 ===============
// =======================================

// 페이지네이션이 적용된 사용자 목록 조회
const getUsers = async (page: number = 1, limit: number = 10) => {
  const {
    data: { users },
    error,
  } = await supabaseAdmin.auth.admin.listUsers({
    page: page - 1, // Supabase는 0-based pagination
    perPage: limit,
  })

  if (error) throw new Error(error.message)

  return {
    users,
    metadata: {
      currentPage: page,
      perPage: limit,
      // Supabase Admin API에서 전체 사용자 수를 제공하지 않아 임시로 처리
      totalPages: Math.ceil(users.length / limit),
      hasMore: users.length === limit,
    },
  }
}

export const useGetUsers = (page: number = 1, limit: number = 10) => {
  return useQuery(["users", page, limit], () => getUsers(page, limit), {
    keepPreviousData: true, // 페이지 전환 시 이전 데이터 유지
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    onError: () => {
      toast.error("사용자 목록을 불러오는데 실패했습니다.")
    },
  })
}

// 특정 사용자 조회
const getUser = async (userId: string) => {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (error) throw new Error(error.message)

  return user
}

// 사용자 생성
const createUser = async (
  email: string,
  password: string,
  userData?: object,
) => {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userData,
  })
  if (error) throw new Error(error.message)

  return user
}

// 사용자 정보 수정
const updateUser = async (userId: string, updates: object) => {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.admin.updateUserById(userId, updates)
  if (error) throw new Error(error.message)

  return user
}

// 사용자 삭제
const deleteUser = async (userId: string) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
}

export const useGetUser = (userId: string) => {
  return useQuery(["user", userId], () => getUser(userId), {
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    onError: () => {
      toast.error("사용자 정보를 불러오는데 실패했습니다.")
    },
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({
      email,
      password,
      userData,
    }: {
      email: string
      password: string
      userData?: object
    }) => createUser(email, password, userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["users"])
        toast.success("사용자가 성공적으로 생성되었습니다.")
      },
      onError: () => {
        toast.error("사용자 생성에 실패했습니다.")
      },
    },
  )
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ userId, updates }: { userId: string; updates: object }) =>
      updateUser(userId, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["users"])
        queryClient.invalidateQueries(["user"])
        toast.success("사용자 정보가 성공적으로 수정되었습니다.")
      },
      onError: () => {
        toast.error("사용자 정보 수정에 실패했습니다.")
      },
    },
  )
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation((userId: string) => deleteUser(userId), {
    onSuccess: () => {
      queryClient.invalidateQueries(["users"])
      toast.success("사용자가 성공적으로 삭제되었습니다.")
    },
    onError: () => {
      toast.error("사용자 삭제에 실패했습니다.")
    },
  })
}

// 사용자 권한 설정 함수
export const setUserRole = async (userId: string, role: "admin" | "user") => {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("사용자 권한 설정 중 오류:", error)

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
