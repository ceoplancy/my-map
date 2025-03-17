import { useQuery } from "react-query"
import { useFilterStore } from "@/store/filterState"
import supabase from "@/lib/supabase/supabaseClient"

interface FilteredStats {
  totalShareholders: number
  totalStocks: number
}

export const useFilteredStats = () => {
  const { statusFilter, companyFilter, cityFilter, stocks } = useFilterStore()

  return useQuery<FilteredStats>({
    queryKey: [
      "filteredStats",
      statusFilter,
      companyFilter,
      cityFilter,
      stocks,
    ],
    queryFn: async () => {
      let query = supabase.from("excel").select("*", { count: "exact" })

      // 필터 적용
      if (statusFilter.length > 0) {
        query = query.in("status", statusFilter)
      }

      if (companyFilter.length > 0) {
        query = query.in("company", companyFilter)
      }

      if (cityFilter) {
        query = query.like("address", `%${cityFilter}%`)
      }

      if (stocks.length > 0) {
        const stockConditions = stocks
          .map(
            (range) => `and(stocks.gte.${range.start},stocks.lte.${range.end})`,
          )
          .join(",")
        query = query.or(stockConditions)
      }

      const { data, count } = await query

      const totalStocks =
        data?.reduce((sum, item) => sum + (item.stocks || 0), 0) || 0

      return {
        totalShareholders: count || 0,
        totalStocks,
      }
    },
  })
}
