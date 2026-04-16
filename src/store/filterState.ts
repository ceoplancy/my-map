import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface StockRange {
  start: number
  end: number
}

export type CompanyStockFilterMap = Record<string, StockRange[]>

interface FilterState {
  boundWorkspaceId: string | null
  statusFilter: string[]
  companyFilter: string[]
  makerFilter: string[]
  cityFilter: string
  stocks: StockRange[]
  companyStockFilterMap: CompanyStockFilterMap
  setStatusFilter: (_v: string[] | ((_prev: string[]) => string[])) => void
  setCompanyFilter: (_v: string[] | ((_prev: string[]) => string[])) => void
  setMakerFilter: (_v: string[] | ((_prev: string[]) => string[])) => void
  setCityFilter: (_v: string | ((_prev: string) => string)) => void
  setStocks: (
    _v: StockRange[] | ((_prev: StockRange[]) => StockRange[]),
  ) => void
  setCompanyStockFilterMap: (
    _v:
      | CompanyStockFilterMap
      | ((_prev: CompanyStockFilterMap) => CompanyStockFilterMap),
  ) => void
  resetFilters: () => void
  ensureWorkspaceScope: (_workspaceId: string) => void
}

const filterFieldsInitial = {
  statusFilter: [] as string[],
  companyFilter: [] as string[],
  makerFilter: [] as string[],
  cityFilter: "",
  stocks: [] as StockRange[],
  companyStockFilterMap: {} as CompanyStockFilterMap,
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((v): v is string => typeof v === "string")
}

const normalizeStockRanges = (value: unknown): StockRange[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (v): v is StockRange =>
      !!v &&
      typeof v === "object" &&
      typeof (v as { start?: unknown }).start === "number" &&
      typeof (v as { end?: unknown }).end === "number",
  )
}

const normalizeCompanyStockFilterMap = (
  value: unknown,
): CompanyStockFilterMap => {
  if (!value || typeof value !== "object") return {}

  const next: CompanyStockFilterMap = {}
  for (const [company, ranges] of Object.entries(value)) {
    next[company] = normalizeStockRanges(ranges)
  }

  return next
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
      setCompanyStockFilterMap: (v) =>
        set((s) => ({
          companyStockFilterMap:
            typeof v === "function" ? v(s.companyStockFilterMap) : v,
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
    {
      name: "filter",
      merge: (persistedState, currentState) => {
        const persisted =
          persistedState && typeof persistedState === "object"
            ? (persistedState as Partial<FilterState>)
            : {}

        return {
          ...currentState,
          ...persisted,
          boundWorkspaceId:
            typeof persisted.boundWorkspaceId === "string" ||
            persisted.boundWorkspaceId === null
              ? persisted.boundWorkspaceId
              : currentState.boundWorkspaceId,
          statusFilter: normalizeStringArray(persisted.statusFilter),
          companyFilter: normalizeStringArray(persisted.companyFilter),
          makerFilter: normalizeStringArray(persisted.makerFilter),
          cityFilter:
            typeof persisted.cityFilter === "string"
              ? persisted.cityFilter
              : "",
          stocks: normalizeStockRanges(persisted.stocks),
          companyStockFilterMap: normalizeCompanyStockFilterMap(
            persisted.companyStockFilterMap,
          ),
        }
      },
    },
  ),
)
