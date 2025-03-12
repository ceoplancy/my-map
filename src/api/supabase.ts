import supabase from "@/config/supabaseClient"
import { useQuery, useMutation, useQueryClient } from "react-query"
import { format } from "date-fns"
import { getCoordinateRanges } from "@/lib/utils"
import { FilterParams } from "@/types"
import { Excel } from "@/types/excel"

// =======================================
// ============== get 엑셀 데이터 ===============
// =======================================
const getExcel = async (mapLevel = 14, params: FilterParams) => {
  let query = supabase.from("excel").select("*", { count: "exact" })

  if (params.status && params.status.length > 0) {
    query = query.in("status", params.status)
  }

  if (params.company && params.company.length > 0) {
    query = query.in("company", params.company)
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

  return data
}

export const useGetExcel = (mapLevel: number, params: FilterParams) => {
  // Create a query key that includes all relevant parameters
  const queryKey = ["excel"]

  return useQuery(queryKey, () => getExcel(mapLevel, params), {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
    staleTime: 1000 * 60 * 5,
    onError: () => {
      alert("네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.")
    },
  })
}

// =========================================
// ============== patch 마커 정보 업데이트 ============
// =========================================
const patchExcel = async (
  excelId: number,
  userId: string,
  patchData: Excel,
) => {
  const makeHistory = `${userId} ${format(new Date(), "yyyy/MM/dd/ HH:mm:ss")}`

  if (patchData.history !== null) {
    const newArr = [...(patchData.history as string[]), makeHistory]

    const result = {
      status: patchData.status,
      memo: patchData.memo,
      history: newArr,
    }

    const { error } = await supabase
      .from("excel")
      .update(result)
      .eq("id", excelId)
      .select()

    if (error) throw new Error(error.message)

    return
  } else {
    const result = {
      status: patchData.status,
      memo: patchData.memo,
      history: [makeHistory],
    }

    const { error } = await supabase
      .from("excel")
      .update(result)
      .eq("id", excelId)
      .select()

    if (error) throw new Error(error.message)

    return
  }
}

export const usePatchExcel = (userId: string) => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, patchData }: { id: number; patchData: Excel }) =>
      patchExcel(id, userId, patchData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["excel"])
        queryClient.invalidateQueries(["filterMenu"])
        queryClient.invalidateQueries(["completedStocks"])
      },
      onError: () => {
        alert("네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.")
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
      alert("네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.")
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
        alert("네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.")
      },
    },
  )
}
