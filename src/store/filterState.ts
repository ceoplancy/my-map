import { atom, useRecoilState, useResetRecoilState } from "recoil"

export const statusFilterState = atom<string[]>({
  key: "statusFilterState",
  default: [],
})

export const companyFilterState = atom<string[]>({
  key: "companyFilterState",
  default: [],
})

export const cityFilterState = atom<string>({
  key: "cityFilterState",
  default: "",
})

// 스톡 필터 타입 수정
export interface StockRange {
  start: number
  end: number
}

export const stocksFilterState = atom<StockRange[]>({
  key: "stocksFilterState",
  default: [],
})

// 편의를 위한 커스텀 훅

export const useFilterStore = () => {
  const [statusFilter, setStatusFilter] = useRecoilState(statusFilterState)
  const [companyFilter, setCompanyFilter] = useRecoilState(companyFilterState)
  const [cityFilter, setCityFilter] = useRecoilState(cityFilterState)
  const [stocks, setStocks] = useRecoilState(stocksFilterState)

  const resetStatusFilter = useResetRecoilState(statusFilterState)
  const resetCompanyFilter = useResetRecoilState(companyFilterState)
  const resetCityFilter = useResetRecoilState(cityFilterState)
  const resetStocksFilter = useResetRecoilState(stocksFilterState)

  const resetFilters = () => {
    resetStatusFilter()
    resetCompanyFilter()
    resetCityFilter()
    resetStocksFilter()
  }

  return {
    statusFilter,
    companyFilter,
    cityFilter,
    stocks,
    setStatusFilter,
    setCompanyFilter,
    setCityFilter,
    setStocks,
    resetFilters,
  }
}
