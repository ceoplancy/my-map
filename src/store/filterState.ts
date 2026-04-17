import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { PrimaryStatus } from "@/lib/shareholderStatus"

export interface StockRange {
  start: number
  end: number
}

export type CompanyStockFilterMap = Record<string, StockRange[]>

/** 회사별 상세 필터(지도). 비어 있으면 전체 탭의 공통 규칙을 따릅니다. */
export type CompanyFilterProfile = {
  statusPrimary?: PrimaryStatus[]
  city?: string
  stockRanges?: StockRange[]
}

export type CompanyFilterProfiles = Record<string, CompanyFilterProfile>

/** 지도 필터 모달 draft·적용 시 복사하는 필드(명부/메이커 등과 동일 스키마) */
export type FilterPersistableFields = {
  statusFilter: string[]
  statusPrimaryFilter: PrimaryStatus[]
  companyFilter: string[]
  makerFilter: string[]
  cityFilter: string
  stocks: StockRange[]
  companyStockFilterMap: CompanyStockFilterMap
  companyFilterProfiles: CompanyFilterProfiles
}

export function getDefaultFilterPersistable(): FilterPersistableFields {
  return {
    statusFilter: [],
    statusPrimaryFilter: [],
    companyFilter: [],
    makerFilter: [],
    cityFilter: "",
    stocks: [],
    companyStockFilterMap: {},
    companyFilterProfiles: {},
  }
}

export interface FilterState {
  boundWorkspaceId: string | null
  statusFilter: string[]

  /** 1차 상태(미방문·완료·보류·실패·전자투표·주주총회) 다중 선택. 비어 있으면 상태로 제한하지 않음 */
  statusPrimaryFilter: PrimaryStatus[]
  companyFilter: string[]
  makerFilter: string[]
  cityFilter: string
  stocks: StockRange[]
  companyStockFilterMap: CompanyStockFilterMap
  companyFilterProfiles: CompanyFilterProfiles
  setStatusFilter: (_v: string[] | ((_prev: string[]) => string[])) => void
  setStatusPrimaryFilter: (
    _v: PrimaryStatus[] | ((_prev: PrimaryStatus[]) => PrimaryStatus[]),
  ) => void
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
  setCompanyFilterProfiles: (
    _v:
      | CompanyFilterProfiles
      | ((_prev: CompanyFilterProfiles) => CompanyFilterProfiles),
  ) => void
  resetFilters: () => void
  ensureWorkspaceScope: (_workspaceId: string) => void
}

export function getFilterPersistableSnapshotFromStore(
  store: Pick<
    FilterState,
    | "statusFilter"
    | "statusPrimaryFilter"
    | "companyFilter"
    | "makerFilter"
    | "cityFilter"
    | "stocks"
    | "companyStockFilterMap"
    | "companyFilterProfiles"
  >,
): FilterPersistableFields {
  return structuredClone({
    statusFilter: store.statusFilter,
    statusPrimaryFilter: store.statusPrimaryFilter,
    companyFilter: store.companyFilter,
    makerFilter: store.makerFilter,
    cityFilter: store.cityFilter,
    stocks: store.stocks,
    companyStockFilterMap: store.companyStockFilterMap,
    companyFilterProfiles: store.companyFilterProfiles,
  })
}

const filterFieldsInitial = {
  statusFilter: [] as string[],
  statusPrimaryFilter: [] as PrimaryStatus[],
  companyFilter: [] as string[],
  makerFilter: [] as string[],
  cityFilter: "",
  stocks: [] as StockRange[],
  companyStockFilterMap: {} as CompanyStockFilterMap,
  companyFilterProfiles: {} as CompanyFilterProfiles,
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

const PRIMARY_SET = new Set<string>([
  "미방문",
  "완료",
  "보류",
  "실패",
  "전자투표",
  "주주총회",
])

const normalizePrimaryArray = (value: unknown): PrimaryStatus[] => {
  if (!Array.isArray(value)) return []

  return value.filter((v): v is PrimaryStatus => PRIMARY_SET.has(String(v)))
}

const normalizeCompanyFilterProfiles = (
  value: unknown,
): CompanyFilterProfiles => {
  if (!value || typeof value !== "object") return {}

  const next: CompanyFilterProfiles = {}
  for (const [company, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== "object") continue
    const r = raw as Record<string, unknown>
    const prof: CompanyFilterProfile = {}
    if (Array.isArray(r.statusPrimary)) {
      prof.statusPrimary = normalizePrimaryArray(r.statusPrimary)
    }
    if (typeof r.city === "string") prof.city = r.city
    if (Array.isArray(r.stockRanges)) {
      prof.stockRanges = normalizeStockRanges(r.stockRanges)
    }
    next[company] = prof
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
      setStatusPrimaryFilter: (v) =>
        set((s) => ({
          statusPrimaryFilter:
            typeof v === "function" ? v(s.statusPrimaryFilter) : v,
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
      setCompanyFilterProfiles: (v) =>
        set((s) => ({
          companyFilterProfiles:
            typeof v === "function" ? v(s.companyFilterProfiles) : v,
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
          statusPrimaryFilter: normalizePrimaryArray(
            persisted.statusPrimaryFilter,
          ),
          companyFilterProfiles: normalizeCompanyFilterProfiles(
            persisted.companyFilterProfiles,
          ),
        }
      },
    },
  ),
)
