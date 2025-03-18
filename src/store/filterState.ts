import { atom, useRecoilState, useResetRecoilState } from "recoil"
import { recoilPersist } from "recoil-persist"

// recoilPersist 설정 추가
const { persistAtom } = recoilPersist({
  key: "filter-persist", // 로컬 스토리지에 저장될 키 이름
  storage: typeof window !== "undefined" ? localStorage : undefined,
})

export const statusFilterState = atom<string[]>({
  key: "statusFilterState",
  default: [],
  effects_UNSTABLE: [persistAtom], // persist 효과 추가
})

export const companyFilterState = atom<string[]>({
  key: "companyFilterState",
  default: [],
  effects_UNSTABLE: [persistAtom],
})

export const makerFilterState = atom<string[]>({
  key: "makerFilterState",
  default: [],
  effects_UNSTABLE: [persistAtom],
})

export const cityFilterState = atom<string>({
  key: "cityFilterState",
  default: "",
  effects_UNSTABLE: [persistAtom],
})

// 스톡 필터 타입 수정
export interface StockRange {
  start: number
  end: number
}

export const stocksFilterState = atom<StockRange[]>({
  key: "stocksFilterState",
  default: [],
  effects_UNSTABLE: [persistAtom],
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
