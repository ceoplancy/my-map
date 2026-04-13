import { useQuery } from "react-query"

import supabase from "@/lib/supabase/supabaseClient"
import { isProxyDelegationCompleted } from "@/lib/shareholderStatus"
import { FilterParams } from "@/types"

interface FilteredStats {
  totalShareholders: number
  totalStocks: number
  completedShareholders: number
  completedStocks: number
}

export const useFilteredStats = (params?: FilterParams) => {
  return useQuery<FilteredStats>({
    queryKey: [
      "filteredStats",
      params?.status,
      params?.company,
      params?.city,
      params?.stocks,
      params?.rosterStockMin,
      params?.rosterStockMax,
      params?.userMetadata,
    ],
    queryFn: async () => {
      // 전체 데이터 쿼리
      let query = supabase.from("excel").select("*", { count: "exact" })

      // 필터 적용
      if (params?.status && params.status.length > 0) {
        query = query.in("status", params.status)
      }

      if (params?.company && params.company.length > 0) {
        query = query.in("company", params.company)
      }

      if (params?.city) {
        query = query.like("address", `%${params.city}%`)
      }

      const useRosterNarrow =
        params?.company &&
        params.company.length === 1 &&
        (params.rosterStockMin != null || params.rosterStockMax != null)

      if (useRosterNarrow && params) {
        const rMin = params.rosterStockMin
        const rMax = params.rosterStockMax
        if (rMin != null && !Number.isNaN(Number(rMin))) {
          query = query.gte("stocks", rMin)
        }
        if (rMax != null && !Number.isNaN(Number(rMax))) {
          query = query.lte("stocks", rMax)
        }
      } else if (params?.stocks && params.stocks.length > 0) {
        const stockConditions = params.stocks
          .map(
            (range) => `and(stocks.gte.${range.start},stocks.lte.${range.end})`,
          )
          .join(",")
        query = query.or(stockConditions)
      }

      const { data, count } = await query

      const completedData =
        data?.filter((item) => isProxyDelegationCompleted(item.status)) || []

      const totalStocks =
        data?.reduce((sum, item) => sum + (item.stocks || 0), 0) || 0
      const completedStocks = completedData.reduce(
        (sum, item) => sum + (item.stocks || 0),
        0,
      )

      return {
        totalShareholders: count || 0,
        totalStocks,
        completedShareholders: completedData.length,
        completedStocks,
      }
    },
  })
}
