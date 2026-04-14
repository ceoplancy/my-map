import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface StockRange {
  start: number
  end: number
}

interface FilterState {
  boundWorkspaceId: string | null
  statusFilter: string[]
  companyFilter: string[]
  makerFilter: string[]
  cityFilter: string
  stocks: StockRange[]
  rosterStockMin: string
  rosterStockMax: string
  setStatusFilter: (_v: string[] | ((_prev: string[]) => string[])) => void
  setCompanyFilter: (_v: string[] | ((_prev: string[]) => string[])) => void
  setMakerFilter: (_v: string[] | ((_prev: string[]) => string[])) => void
  setCityFilter: (_v: string | ((_prev: string) => string)) => void
  setStocks: (
    _v: StockRange[] | ((_prev: StockRange[]) => StockRange[]),
  ) => void
  setRosterStockMin: (_v: string | ((_prev: string) => string)) => void
  setRosterStockMax: (_v: string | ((_prev: string) => string)) => void
  resetFilters: () => void
  ensureWorkspaceScope: (_workspaceId: string) => void
}

const filterFieldsInitial = {
  statusFilter: [] as string[],
  companyFilter: [] as string[],
  makerFilter: [] as string[],
  cityFilter: "",
  stocks: [] as StockRange[],
  rosterStockMin: "",
  rosterStockMax: "",
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      boundWorkspaceId: null,
      ...filterFieldsInitial,
      setStatusFilter: (v) =>
        set((s) => ({
          statusFilter: typeof v === "function" ? v(s.statusFilter) : v,
        })),
      setCompanyFilter: (v) =>
        set((s) => ({
          companyFilter: typeof v === "function" ? v(s.companyFilter) : v,
        })),
      setMakerFilter: (v) =>
        set((s) => ({
          makerFilter: typeof v === "function" ? v(s.makerFilter) : v,
        })),
      setCityFilter: (v) =>
        set((s) => ({
          cityFilter: typeof v === "function" ? v(s.cityFilter) : v,
        })),
      setStocks: (v) =>
        set((s) => ({
          stocks: typeof v === "function" ? v(s.stocks) : v,
        })),
      setRosterStockMin: (v) =>
        set((s) => ({
          rosterStockMin: typeof v === "function" ? v(s.rosterStockMin) : v,
        })),
      setRosterStockMax: (v) =>
        set((s) => ({
          rosterStockMax: typeof v === "function" ? v(s.rosterStockMax) : v,
        })),
      resetFilters: () =>
        set((s) => ({
          ...filterFieldsInitial,
          boundWorkspaceId: s.boundWorkspaceId,
        })),
      ensureWorkspaceScope: (workspaceId) =>
        set((s) => {
          if (s.boundWorkspaceId === workspaceId) {
            return s
          }

          return {
            ...filterFieldsInitial,
            boundWorkspaceId: workspaceId,
          }
        }),
    }),
    { name: "filter" },
  ),
)
