import supabase from "@/lib/supabase/supabaseClient"
import supabaseAdmin from "@/lib/supabase/supabaseAdminClient"
import { useQuery, useMutation, useQueryClient } from "react-query"
import { format } from "date-fns"
import { getCoordinateRanges } from "@/lib/utils"
import { FilterParams } from "@/types"
import { Excel } from "@/types/excel"
import { toast } from "react-toastify"

// =======================================
// ============== get 엑셀 데이터 ===============
// =======================================
const getExcel = async (mapLevel = 14, params?: FilterParams) => {
  let query = supabase.from("excel").select("*", { count: "exact" })

  if (params?.status && params.status.length > 0) {
    query = query.in("status", params.status)
  }

  if (params?.company && params.company.length > 0) {
    query = query.in("company", params.company)
  }

  if (params?.city && params.city.length > 0) {
    query = query.like("address", `%${params.city}%`)
  }

  if (params?.startStocks && params.startStocks > 0) {
    query = query.gte("stocks", params.startStocks)
  }

  if (params?.endStocks && params.endStocks > 0) {
    query = query.lte("stocks", params.endStocks)
  }

  // 위도, 경도 필터링 (지도의 확대 레벨에 따라 조정)
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
  // Create a query key that includes all relevant parameters
  const queryKey = ["excel"]

  return useQuery(queryKey, () => getExcel(mapLevel, params), {
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

// =========================================
// ============== patch 마커 정보 업데이트 ============
// =========================================
const patchExcel = async (excelId: number, patchData: Excel) => {
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
      patchExcel(id, patchData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["excel"])
        queryClient.invalidateQueries(["filterMenu"])
        queryClient.invalidateQueries(["completedStocks"])
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
  const { data, error } = await supabase.from("excel").select()

  if (error) throw new Error(error.message)

  const statusArray = data?.map((item) => item.status)
  const companyMenuArray = data?.map((item) => item.company)

  const uniqueStatusArray = [...new Set(statusArray)]
  const uniqueCompanyMenuArray = [...new Set(companyMenuArray)]

  return {
    statusMenu: uniqueStatusArray,
    companyMenu: uniqueCompanyMenuArray,
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

// ================================================
// ============== get 필터 된 마커 정보 ===================
// ================================================
const getCompletedFilterMaker = async (mapLevel = 14, params: FilterParams) => {
  let query = supabase.from("excel").select("*", { count: "exact" })

  if (params.status && params.status.length > 0) {
    query = query.in("status", params.status)
  }

  if (params.company && params.company.length > 0) {
    query = query.in("company", params.company)
  }

  if (params.city && params.city.length > 0) {
    query = query.like("address", `%${params.city}%`)
  }

  if (params.startStocks && params.startStocks > 0) {
    query = query.gte("stocks", params.startStocks)
  }

  if (params.endStocks && params.endStocks > 0) {
    query = query.lte("stocks", params.endStocks)
  }

  // 위도, 경도 필터링 (지도의 확대 레벨에 따라 조정)
  if (params.lat && params.lng) {
    const { latRange, lngRange } = getCoordinateRanges(mapLevel)

    query = query.gte("lat", params.lat - latRange)
    query = query.lte("lat", params.lat + latRange)
    query = query.gte("lng", params.lng - lngRange)
    query = query.lte("lng", params.lng + lngRange)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  const sumCompletedStocks = () => {
    const totalStocks = data
      .map((item) => item.stocks)
      .reduce((accumulator, currentValue) => accumulator + currentValue, 0)

    return totalStocks
  }

  return {
    sumCompletedStocks: sumCompletedStocks(),
    length: data.length,
  }
}

export const useGetCompletedFilterMaker = (
  mapLevel = 14,
  params: FilterParams,
) => {
  return useQuery(
    ["completedFilterMaker"],
    () => getCompletedFilterMaker(mapLevel, params),
    {
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
    },
  )
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
