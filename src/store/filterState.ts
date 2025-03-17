import { atom, useRecoilState, useResetRecoilState } from "recoil"

export const statusFilterState = atom<string[]>({
  key: "statusFilterState",
  default: [],
})

export const companyFilterState = atom<string[]>({
  key: "companyFilterState",
  default: [],
})

export const makerFilterState = atom<string[]>({
  key: "makerFilterState",
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
  const [makerFilter, setMakerFilter] = useRecoilState(makerFilterState)
  const [cityFilter, setCityFilter] = useRecoilState(cityFilterState)
  const [stocks, setStocks] = useRecoilState(stocksFilterState)

  const resetStatusFilter = useResetRecoilState(statusFilterState)
  const resetCompanyFilter = useResetRecoilState(companyFilterState)
  const resetMakerFilter = useResetRecoilState(makerFilterState)
  const resetCityFilter = useResetRecoilState(cityFilterState)
  const resetStocksFilter = useResetRecoilState(stocksFilterState)

  const resetFilters = () => {
    resetStatusFilter()
    resetCompanyFilter()
    resetMakerFilter()
    resetCityFilter()
    resetStocksFilter()
  }

  return {
    statusFilter,
    companyFilter,
    makerFilter,
    cityFilter,
    stocks,
    setStatusFilter,
    setCompanyFilter,
    setMakerFilter,
    setCityFilter,
    setStocks,
    resetFilters,
  }
}
