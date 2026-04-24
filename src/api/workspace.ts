import { useMemo } from "react"
import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import * as Sentry from "@sentry/nextjs"
import { toast } from "react-toastify"
import {
  apiClient,
  apiErrorMessageFromHttpResponse,
  axiosWithBearerRetry,
  bearerHeaders,
  getJsonWithBearerIfOk,
  isHttpOk,
  throwApiErrorFromHttpResponse,
} from "@/lib/apiClient"
import {
  getAccessToken,
  recoverAccessTokenAfterAuthFailure,
} from "@/lib/auth/clientAuth"
import supabase from "@/lib/supabase/supabaseClient"
import type { Tables, WorkspaceRole } from "@/types/db"
import { shouldReportSentryForHttpStatus } from "@/lib/httpReporting"
import { reportError } from "@/lib/reportError"
import { isPostgrestUndefinedColumnError } from "@/lib/postgrestErrors"
import { truncateChangeHistoryValue } from "@/lib/shareholderChangeHistoryValues"
import { requireSupabaseRow } from "@/lib/supabaseMaybeSingle"
import { getCoordinateRanges } from "@/lib/utils"
import type {
  CompanyFilterProfiles,
  CompanyStockFilterMap,
  StockRange,
} from "@/store/filterState"
import {
  getPrimaryStatusCategory,
  PRIMARY_STATUS_OPTIONS,
  type PrimaryStatus,
} from "@/lib/shareholderStatus"

type ShareholderList = Tables<"shareholder_lists">
type Shareholder = Tables<"shareholders">

function toHistoryValue(v: unknown): string | null {
  if (v === null || v === undefined) {
    return null
  }
  let s: string
  if (typeof v === "string") {
    s = v
  } else if (typeof v === "number" || typeof v === "boolean") {
    s = String(v)
  } else {
    s = JSON.stringify(v)
  }

  return truncateChangeHistoryValue(s)
}

/** PostgREST ilike 패턴에 넣기 위한 `%`, `_`, `\` 이스케이프 */
function escapePostgrestLikePattern(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

/**
 * 뷰포트 bbox를 PostgREST `and(lat...,lat...,lng...,lng...)` 조각으로 만든다.
 * `lat=gte&lat=lte`처럼 동일 컬럼 키를 URL에 반복하면 게이트웨이/PostgREST에서 400이 날 수 있어
 * 단일 `or(and(...))`로 합친다.
 */
function viewportBBoxPostgrestFragment(
  lat: number,
  lng: number,
  mapLevel: number,
): string {
  const { latRange, lngRange } = getCoordinateRanges(mapLevel)

  return `lat.gte.${lat - latRange},lat.lte.${lat + latRange},lng.gte.${lng - lngRange},lng.lte.${lng + lngRange}`
}

/** PostgREST `.or()` 인자 내부: 이름·회사·주소·메모·휴대폰 등 OR로 묶은 ilike 조각(콤마 구분, 바깥 `or()` 없음) */
function shareholderTextSearchOrInner(searchTrim: string): string {
  const q = escapePostgrestLikePattern(searchTrim)

  return [
    `name.ilike.%${q}%`,
    `company.ilike.%${q}%`,
    `address.ilike.%${q}%`,
    `address_original.ilike.%${q}%`,
    `latlngaddress.ilike.%${q}%`,
    `memo.ilike.%${q}%`,
    `phone.ilike.%${q}%`,
  ].join(",")
}

/**
 * 주식 구간 OR + 뷰포트 bbox + 통합 검색을 PostgREST에 맞게 한 번의 `.or()`로만 적용한다.
 * `or=(주식…)&or=(검색…)`처럼 `or` 키가 URL에 두 번 나오면 400이 나는 환경이 있어
 * `or(and(구간,or(필드들)),…)` 형태로 합친다.
 */
function applyShareholderStockBboxSearchOr<Q extends { or: (_s: string) => Q }>(
  query: Q,
  args: {
    searchTrim?: string
    stocks?: { start: number; end: number }[]
    bboxFragment: string | null
  },
): Q {
  const stocks = args.stocks
  const searchTrim = args.searchTrim?.trim()
  const bboxFragment = args.bboxFragment
  const searchInner = searchTrim ? shareholderTextSearchOrInner(searchTrim) : ""

  if (stocks?.length) {
    if (searchTrim) {
      const disjuncts = stocks.map((r) => {
        const bounds = `stocks.gte.${r.start},stocks.lte.${r.end}`

        return bboxFragment
          ? `and(${bounds},${bboxFragment},or(${searchInner}))`
          : `and(${bounds},or(${searchInner}))`
      })

      return query.or(disjuncts.join(","))
    }
    if (bboxFragment) {
      return query.or(
        stocks
          .map(
            (r) =>
              `and(stocks.gte.${r.start},stocks.lte.${r.end},${bboxFragment})`,
          )
          .join(","),
      )
    }

    return query.or(
      stocks
        .map((r) => `and(stocks.gte.${r.start},stocks.lte.${r.end})`)
        .join(","),
    )
  }
  if (bboxFragment && searchTrim) {
    return query.or(`and(${bboxFragment},or(${searchInner}))`)
  }
  if (bboxFragment) {
    return query.or(`and(${bboxFragment})`)
  }
  if (searchTrim) {
    return query.or(searchInner)
  }

  return query
}

const getShareholderLists = async (workspaceId: string) => {
  const { data, error } = await supabase
    .from("shareholder_lists")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
  if (error) {
    reportError(error)
    throw new Error(error.message)
  }

  return data ?? []
}

type WorkspaceMember = Tables<"workspace_members">

const getWorkspaceMembers = async (
  workspaceId: string,
): Promise<WorkspaceMember[]> => {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
  if (error) {
    reportError(error)
    throw new Error(error.message)
  }

  return data ?? []
}

export const useWorkspaceMembers = (workspaceId: string | null) => {
  return useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () =>
      workspaceId ? getWorkspaceMembers(workspaceId) : Promise.resolve([]),
    enabled: !!workspaceId,
  })
}

export type WorkspaceMemberWithUser = {
  id: string
  user_id: string
  workspace_id: string | null
  role: string
  created_at: string
  email: string | null
  name: string | null
  allowed_list_ids?: string[] | null
  is_team_leader?: boolean | null
}

const getWorkspaceMembersWithUsers = async (
  workspaceId: string,
): Promise<WorkspaceMemberWithUser[]> => {
  const json = await getJsonWithBearerIfOk<WorkspaceMemberWithUser[] | unknown>(
    `/api/me/workspace-members?workspaceId=${encodeURIComponent(workspaceId)}`,
  )
  if (json === null) return []

  return Array.isArray(json) ? json : []
}

export const useWorkspaceMembersWithUsers = (workspaceId: string | null) => {
  return useQuery({
    queryKey: ["workspaceMembersWithUsers", workspaceId],
    queryFn: () =>
      workspaceId
        ? getWorkspaceMembersWithUsers(workspaceId)
        : Promise.resolve([]),
    enabled: !!workspaceId,
  })
}

export type AddWorkspaceMemberInput = {
  workspaceId: string
  email: string
  role: "service_admin" | "top_admin" | "admin" | "field_agent"
  name?: string
  password?: string
  allowed_list_ids?: string[] | null
}

export const useAddWorkspaceMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AddWorkspaceMemberInput) => {
      const token = await getAccessToken()
      if (!token) throw new Error("Unauthorized")
      const body: Record<string, unknown> = {
        workspaceId: input.workspaceId,
        email: input.email.trim(),
        role: input.role,
      }
      if (input.name !== undefined) body.name = input.name
      if (input.password !== undefined) body.password = input.password
      if (input.allowed_list_ids !== undefined)
        body.allowed_list_ids = input.allowed_list_ids

      const res = await apiClient.post("/api/me/workspace-members", body, {
        headers: bearerHeaders(token),
      })
      if (!isHttpOk(res.status)) {
        throwApiErrorFromHttpResponse(res, res.statusText || "Request failed")
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspaceMembersWithUsers", variables.workspaceId],
      })
      toast.success("멤버가 추가되었습니다.")
    },
    onError: (e: Error) => {
      toast.error(e.message || "멤버 추가에 실패했습니다.")
    },
  })
}

export const useRemoveWorkspaceMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workspaceId,
      memberId,
    }: {
      workspaceId: string
      memberId: string
    }) => {
      const token = await getAccessToken()
      if (!token) throw new Error("Unauthorized")
      const res = await apiClient.delete(
        `/api/me/workspace-members?workspaceId=${encodeURIComponent(workspaceId)}&memberId=${encodeURIComponent(memberId)}`,
        { headers: bearerHeaders(token) },
      )
      if (!isHttpOk(res.status)) {
        throwApiErrorFromHttpResponse(res, res.statusText || "Request failed")
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspaceMembersWithUsers", variables.workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["workspaceMembers", variables.workspaceId],
      })
      toast.success("멤버가 삭제되었습니다.")
    },
    onError: (e: Error) => {
      toast.error(e.message || "멤버 삭제에 실패했습니다.")
    },
  })
}

export type UpdateWorkspaceMemberInput = {
  workspaceId: string
  memberId: string
  role?: WorkspaceRole
  allowed_list_ids?: string[] | null
  is_team_leader?: boolean
}

export const useUpdateWorkspaceMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateWorkspaceMemberInput) => {
      const token = await getAccessToken()
      if (!token) throw new Error("Unauthorized")
      const body: Record<string, unknown> = { memberId: input.memberId }
      if (input.role !== undefined) body.role = input.role
      if (Object.prototype.hasOwnProperty.call(input, "allowed_list_ids")) {
        body.allowed_list_ids = input.allowed_list_ids
      }
      if (input.is_team_leader !== undefined) {
        body.is_team_leader = input.is_team_leader
      }
      const res = await apiClient.patch(
        `/api/me/workspace-members?workspaceId=${encodeURIComponent(input.workspaceId)}`,
        body,
        { headers: bearerHeaders(token) },
      )
      if (!isHttpOk(res.status)) {
        throwApiErrorFromHttpResponse(res, res.statusText || "Request failed")
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspaceMembersWithUsers", variables.workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["workspaceMembers", variables.workspaceId],
      })
      toast.success("멤버 정보가 수정되었습니다.")
    },
    onError: (e: Error) => {
      toast.error(e.message || "멤버 수정에 실패했습니다.")
    },
  })
}

export const useShareholderLists = (workspaceId: string | null) => {
  return useQuery({
    queryKey: ["shareholderLists", workspaceId],
    queryFn: () =>
      workspaceId ? getShareholderLists(workspaceId) : Promise.resolve([]),
    enabled: !!workspaceId,
  })
}

/** 대시보드 등: 명부별 담당(maker)·상태 집계용 경량 행 */
export type ShareholderMakerSummaryRow = Pick<
  Tables<"shareholders">,
  "list_id" | "maker" | "status" | "stocks" | "company"
>

/** 워크스페이스 소속 명부 전체에 대한 담당·상태 요약 행 (한 번 조회) */
export const useShareholdersMakerSummaryRows = (listIds: string[]) => {
  const key = [...listIds].sort().join(",")

  return useQuery({
    queryKey: ["shareholdersMakerSummaryRows", key],
    queryFn: async (): Promise<ShareholderMakerSummaryRow[]> => {
      if (listIds.length === 0) return []
      const { data, error } = await supabase
        .from("shareholders")
        .select("list_id, maker, status, stocks, company")
        .in("list_id", listIds)
      if (error) {
        reportError(error)
        throw new Error(error.message)
      }

      return (data ?? []) as ShareholderMakerSummaryRow[]
    },
    enabled: listIds.length > 0,
    staleTime: 60_000,
  })
}

export type WorkspaceChangeHistorySummary = {
  byUserId: Record<
    string,
    {
      completedDistinctCount: number
      onHoldDistinctCount: number
    }
  >
}

async function getWorkspaceChangeHistorySummary(
  listIds: string[],
  recentDays?: number,
): Promise<WorkspaceChangeHistorySummary> {
  if (listIds.length === 0) return { byUserId: {} }
  let query = supabase
    .from("shareholder_change_history")
    .select(
      "changed_by, shareholder_id, field, new_value, shareholders!inner(list_id)",
    )
    .in("shareholders.list_id", listIds)
  if (recentDays && recentDays > 0) {
    const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)
    query = query.gte("changed_at", since.toISOString())
  }
  const { data, error } = await query
  if (error) {
    reportError(error)
    throw new Error(error.message)
  }

  const completedSets = new Map<string, Set<string>>()
  const onHoldSets = new Map<string, Set<string>>()
  for (const row of data ?? []) {
    const userId = String(
      (row as { changed_by?: string | null }).changed_by ?? "",
    ).trim()
    if (!userId) continue
    const shareholderId = String(
      (row as { shareholder_id?: string | null }).shareholder_id ?? "",
    ).trim()
    if (!shareholderId) continue
    const field = String((row as { field?: string | null }).field ?? "").trim()
    if (field !== "status") continue
    const newValue = (row as { new_value?: string | null }).new_value
    const primary = getPrimaryStatusCategory(newValue)
    if (primary === "완료") {
      const set = completedSets.get(userId) ?? new Set<string>()
      set.add(shareholderId)
      completedSets.set(userId, set)
    }
    if (primary === "보류") {
      const set = onHoldSets.get(userId) ?? new Set<string>()
      set.add(shareholderId)
      onHoldSets.set(userId, set)
    }
  }

  const userIds = new Set<string>([
    ...completedSets.keys(),
    ...onHoldSets.keys(),
  ])
  const byUserId: WorkspaceChangeHistorySummary["byUserId"] = {}
  for (const userId of userIds) {
    byUserId[userId] = {
      completedDistinctCount: completedSets.get(userId)?.size ?? 0,
      onHoldDistinctCount: onHoldSets.get(userId)?.size ?? 0,
    }
  }

  return { byUserId }
}

export const useWorkspaceChangeHistorySummary = (
  listIds: string[],
  recentDays?: number,
) => {
  const key = [...listIds].sort().join(",")

  return useQuery({
    queryKey: ["workspaceChangeHistorySummary", key, recentDays ?? 0],
    queryFn: () => getWorkspaceChangeHistorySummary(listIds, recentDays),
    enabled: listIds.length > 0,
    staleTime: 60_000,
  })
}

/** List IDs the current user can see on the map (is_visible, active period, field_agent allowed_list_ids). */
export function useVisibleListIds(
  workspaceId: string | null,
  userId: string | undefined,
): string[] {
  const { data: lists = [] } = useShareholderLists(workspaceId)
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const myMember = members.find((m) => m.user_id === userId)
  const now = new Date().toISOString().slice(0, 10)

  return useMemo(() => {
    const visible = lists.filter((list) => {
      if (!list.is_visible) return false
      if (list.active_from && now < list.active_from) return false
      if (list.active_to && now > list.active_to) return false

      return true
    })
    if (myMember?.role === "field_agent" && myMember.allowed_list_ids?.length) {
      const listIds = myMember.allowed_list_ids ?? []

      return visible.filter((l) => listIds.includes(l.id)).map((l) => l.id)
    }

    return visible.map((l) => l.id)
  }, [lists, myMember, now])
}

/**
 * 대시보드·의결권 현황 집계용 명부 ID.
 * 지도와 달리 `is_visible`/활동 기간으로 숨겨진 명부도 포함(워크스페이스에서 받아온 목록 전체).
 * 현장요원은 `allowed_list_ids` 안의 명부만.
 */
export function useDashboardListIds(
  workspaceId: string | null,
  userId: string | undefined,
): string[] {
  const { data: lists = [] } = useShareholderLists(workspaceId)
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const myMember = members.find((m) => m.user_id === userId)

  return useMemo(() => {
    if (myMember?.role === "field_agent" && myMember.allowed_list_ids?.length) {
      const allowed = new Set(myMember.allowed_list_ids)

      return lists.filter((l) => allowed.has(l.id)).map((l) => l.id)
    }

    return lists.map((l) => l.id)
  }, [lists, myMember])
}

export type ShareholdersParams = {
  listId?: string | null
  listIds?: string[] | null
  status?: string[]

  /** 1차 상태 필터(지도). 설정 시 서버 status.in 대신 조회 후 클라이언트에서 매칭 */
  statusPrimaryFilter?: PrimaryStatus[]
  company?: string[]
  maker?: string | null
  city?: string
  stocks?: { start: number; end: number }[]
  lat?: number
  lng?: number
  mapLevel?: number
  companyStockFilterMap?: CompanyStockFilterMap

  /** 회사별 상세(상태·지역·주식수). 설정된 회사는 여기 우선 */
  companyFilterProfiles?: CompanyFilterProfiles

  /** 이름·회사·주소 통합 검색(맵 등). 설정 시 뷰포트(lat/lng/mapLevel) 제한은 적용하지 않음 */
  search?: string

  /**
   * true이면 `search`가 비어 있을 때 주주 쿼리를 실행하지 않음.
   * 검색 전용 페이지에서 명부 전체를 불러오지 않도록 할 때 사용.
   */
  requireSearchToFetch?: boolean

  /** 관리자 목록: 사진 있음/없음 (클라이언트 필터) */
  photoFilter?: "with" | "without"

  /** 주소 변환(지오코딩) 성공·대기·실패 클라이언트 필터. null·빈 값은 성공(ok)으로 간주 */
  geocodeStatusFilter?: ("ok" | "pending" | "failed")[]
}

type CompanyStockStats = Record<
  string,
  {
    min: number
    max: number
    count: number
  }
>

function hasCompanyStockFilterMap(
  map: CompanyStockFilterMap | undefined,
): map is CompanyStockFilterMap {
  return !!map && Object.keys(map).length > 0
}

function getCompanyStockGlobalBounds(map: CompanyStockFilterMap): {
  min: number
  max: number
} | null {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const ranges of Object.values(map)) {
    for (const range of ranges) {
      if (range.start < min) min = range.start
      if (range.end > max) max = range.end
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null

  return { min, max }
}

function matchesRange(stocks: number, range: StockRange): boolean {
  return stocks >= range.start && stocks <= range.end
}

function hasCompanyFilterProfiles(
  p: CompanyFilterProfiles | undefined,
): p is CompanyFilterProfiles {
  return !!p && Object.keys(p).length > 0
}

/** 지도 필터: 1차 상태·회사별 프로필·주식(프로필 우선) */
function applyShareholderPostFilters<
  T extends {
    status: string | null
    company: string | null
    stocks: number | null
    address: string | null
  },
>(rows: T[], params: ShareholdersParams): T[] {
  const profiles = params.companyFilterProfiles ?? {}

  return rows.filter((row) => {
    if (params.photoFilter === "with") {
      const img = (row as { image?: string | null }).image
      if (!img || String(img).trim() === "") return false
    }
    if (params.photoFilter === "without") {
      const img = (row as { image?: string | null }).image
      if (img && String(img).trim() !== "") return false
    }

    if (params.geocodeStatusFilter?.length) {
      const raw = (row as { geocode_status?: string | null }).geocode_status
      const gs: "ok" | "pending" | "failed" =
        raw === "pending" ? "pending" : raw === "failed" ? "failed" : "ok"
      if (!params.geocodeStatusFilter.includes(gs)) return false
    }

    const company = row.company ?? ""
    const prof = profiles[company]

    if (prof?.statusPrimary !== undefined) {
      if (prof.statusPrimary.length > 0) {
        const cat = getPrimaryStatusCategory(row.status)
        if (!prof.statusPrimary.includes(cat)) return false
      }
    } else if (params.statusPrimaryFilter?.length) {
      const cat = getPrimaryStatusCategory(row.status)
      if (!params.statusPrimaryFilter.includes(cat)) return false
    } else if (params.status?.length) {
      if (!params.status.includes(row.status ?? "")) return false
    }

    let cityRule: string | undefined
    if (prof?.city !== undefined) {
      cityRule = prof.city || undefined
    } else if (params.city) {
      cityRule = params.city
    }
    if (cityRule && !(row.address ?? "").includes(cityRule)) return false

    const stocks = Number(row.stocks ?? 0)
    if (prof?.stockRanges?.length) {
      if (!prof.stockRanges.some((r) => matchesRange(stocks, r))) return false
    } else {
      if (params.stocks?.length) {
        if (!params.stocks.some((r) => matchesRange(stocks, r))) return false
      }
      if (hasCompanyStockFilterMap(params.companyStockFilterMap)) {
        const cr = params.companyStockFilterMap?.[company]
        if (cr?.length && !cr.some((r) => matchesRange(stocks, r))) return false
      }
    }

    return true
  })
}

const getCompanyStockStatsForLists = async (
  listIds: string[],
): Promise<CompanyStockStats> => {
  if (listIds.length === 0) return {}
  const { data, error } = await supabase
    .from("shareholders")
    .select("company, stocks")
    .in("list_id", listIds)
  if (error) {
    reportError(error)

    return {}
  }
  const stats: CompanyStockStats = {}
  for (const row of data ?? []) {
    const company = (row.company ?? "").trim()
    if (!company) continue
    const stocks = Number(row.stocks ?? 0)
    const prev = stats[company]
    if (!prev) {
      stats[company] = { min: stocks, max: stocks, count: 1 }
      continue
    }
    stats[company] = {
      min: Math.min(prev.min, stocks),
      max: Math.max(prev.max, stocks),
      count: prev.count + 1,
    }
  }

  return stats
}

export const useCompanyStockStatsForLists = (listIds: string[] | null) => {
  const hasLists = Array.isArray(listIds) && listIds.length > 0

  return useQuery({
    queryKey: ["companyStockStatsForLists", listIds],
    queryFn: () => getCompanyStockStatsForLists(listIds ?? []),
    enabled: hasLists,
    staleTime: 1000 * 60 * 5,
  })
}

const getShareholders = async (params: ShareholdersParams) => {
  const listIds = params.listIds?.length
    ? params.listIds
    : params.listId
      ? [params.listId]
      : []
  if (listIds.length === 0) {
    return []
  }

  let query = supabase.from("shareholders").select("*", { count: "exact" })
  if (listIds.length === 1) {
    query = query.eq("list_id", listIds[0])
  } else {
    query = query.in("list_id", listIds)
  }
  const useClientStatusOrProfiles =
    (params.statusPrimaryFilter?.length ?? 0) > 0 ||
    hasCompanyFilterProfiles(params.companyFilterProfiles)
  const useClientCityForProfiles = hasCompanyFilterProfiles(
    params.companyFilterProfiles,
  )

  const statusForQueryGet = params.status?.filter(
    (s) => s != null && String(s).trim() !== "",
  )
  if (statusForQueryGet?.length && !useClientStatusOrProfiles) {
    query = query.in("status", statusForQueryGet)
  }
  if (params.company?.length) {
    query = query.in("company", params.company)
  }
  if (params.maker) {
    query = query.eq("maker", params.maker)
  }
  if (params.city && !useClientCityForProfiles) {
    query = query.like("address", `%${params.city}%`)
  }

  const searchTrim = params.search?.trim()
  const bboxFragment =
    !searchTrim &&
    params.lat != null &&
    params.lng != null &&
    params.mapLevel != null
      ? viewportBBoxPostgrestFragment(params.lat, params.lng, params.mapLevel)
      : null

  query = applyShareholderStockBboxSearchOr(query, {
    searchTrim,
    stocks: params.stocks,
    bboxFragment,
  })
  if (hasCompanyStockFilterMap(params.companyStockFilterMap)) {
    const bounds = getCompanyStockGlobalBounds(params.companyStockFilterMap)
    if (bounds) {
      query = query.gte("stocks", bounds.min)
      query = query.lte("stocks", bounds.max)
    }
  }

  const { data, error } = await query
  if (error) {
    reportError(error)
    throw new Error(error.message)
  }

  let rows = data ?? []
  rows = applyShareholderPostFilters(rows, params)

  return rows
}

export type CompanyPrimaryStatsRow = {
  company: string
  byPrimary: Record<PrimaryStatus, { count: number; stocks: number }>
  totalShareholders: number
  totalStocks: number
}

export type ShareholderStats = {
  totalShareholders: number
  totalStocks: number
  completedShareholders: number
  completedStocks: number

  /** 필터 적용 후 1차 상태별 집계 */
  byPrimary: Record<PrimaryStatus, { count: number; stocks: number }>

  /** 회사명 기준 1차 상태(동일 필터·쿼리 범위) */
  byCompanyPrimary: CompanyPrimaryStatsRow[]
}

const emptyByPrimary = (): Record<
  PrimaryStatus,
  { count: number; stocks: number }
> => {
  const o = {} as Record<PrimaryStatus, { count: number; stocks: number }>
  for (const p of PRIMARY_STATUS_OPTIONS) {
    o[p] = { count: 0, stocks: 0 }
  }

  return o
}

const getShareholderStats = async (
  params: ShareholdersParams,
): Promise<ShareholderStats> => {
  const listIds = params.listIds?.length
    ? params.listIds
    : params.listId
      ? [params.listId]
      : []
  if (listIds.length === 0) {
    return {
      totalShareholders: 0,
      totalStocks: 0,
      completedShareholders: 0,
      completedStocks: 0,
      byPrimary: emptyByPrimary(),
      byCompanyPrimary: [],
    }
  }

  const buildShareholderStatsQuery = (select: string) => {
    let q = supabase.from("shareholders").select(select)
    if (listIds.length === 1) {
      q = q.eq("list_id", listIds[0])
    } else {
      q = q.in("list_id", listIds)
    }
    const useClientStatusOrProfiles =
      (params.statusPrimaryFilter?.length ?? 0) > 0 ||
      hasCompanyFilterProfiles(params.companyFilterProfiles)
    const useClientCityForProfiles = hasCompanyFilterProfiles(
      params.companyFilterProfiles,
    )

    const statusForQuery =
      params.status?.filter((s) => s != null && String(s).trim() !== "") ?? []
    if (statusForQuery.length && !useClientStatusOrProfiles) {
      q = q.in("status", statusForQuery)
    }
    if (params.company?.length) {
      q = q.in("company", params.company)
    }
    if (params.maker) {
      q = q.eq("maker", params.maker)
    }
    if (params.city && !useClientCityForProfiles) {
      q = q.like("address", `%${params.city}%`)
    }

    const statsSearchTrim = params.search?.trim()
    const statsBboxFragment =
      !statsSearchTrim &&
      params.lat != null &&
      params.lng != null &&
      params.mapLevel != null
        ? viewportBBoxPostgrestFragment(params.lat, params.lng, params.mapLevel)
        : null

    q = applyShareholderStockBboxSearchOr(q, {
      searchTrim: statsSearchTrim,
      stocks: params.stocks,
      bboxFragment: statsBboxFragment,
    })
    if (hasCompanyStockFilterMap(params.companyStockFilterMap)) {
      const bounds = getCompanyStockGlobalBounds(params.companyStockFilterMap)
      if (bounds) {
        q = q.gte("stocks", bounds.min)
        q = q.lte("stocks", bounds.max)
      }
    }

    return q
  }

  const selectBase = "status, stocks, company, address, image"
  const wantsGeocodeColumn = (params.geocodeStatusFilter?.length ?? 0) > 0
  const selectWithGeocode = `${selectBase}, geocode_status`

  type StatsRow = {
    status: string | null
    stocks: number | null
    company: string | null
    address: string | null
    image?: string | null
    geocode_status?: string | null
  }

  const first = await buildShareholderStatsQuery(
    wantsGeocodeColumn ? selectWithGeocode : selectBase,
  )
  let rawRows = (first.data ?? []) as unknown as StatsRow[]
  let err = first.error
  if (err && wantsGeocodeColumn && isPostgrestUndefinedColumnError(err)) {
    const second = await buildShareholderStatsQuery(selectBase)
    err = second.error
    rawRows = (second.data ?? []) as unknown as StatsRow[]
  }
  if (err) {
    reportError(err)
    throw new Error(err.message)
  }
  const rows = applyShareholderPostFilters(rawRows, params)
  const totalStocks = rows.reduce((sum, r) => sum + (Number(r.stocks) || 0), 0)
  const completedRows = rows.filter(
    (r) => getPrimaryStatusCategory(r.status) === "완료",
  )
  const completedStocks = completedRows.reduce(
    (sum, r) => sum + (Number(r.stocks) || 0),
    0,
  )

  const byPrimary = emptyByPrimary()
  const companyBuckets = new Map<
    string,
    Record<PrimaryStatus, { count: number; stocks: number }>
  >()

  for (const r of rows) {
    const primary = getPrimaryStatusCategory(r.status)
    byPrimary[primary].count += 1
    byPrimary[primary].stocks += Number(r.stocks) || 0

    const companyLabel = (r.company ?? "").trim() || "회사 미입력"
    if (!companyBuckets.has(companyLabel)) {
      companyBuckets.set(companyLabel, emptyByPrimary())
    }
    const cb = companyBuckets.get(companyLabel)!
    cb[primary].count += 1
    cb[primary].stocks += Number(r.stocks) || 0
  }

  const byCompanyPrimary: CompanyPrimaryStatsRow[] = [
    ...companyBuckets.entries(),
  ]
    .map(([company, bp]) => ({
      company,
      byPrimary: bp,
      totalShareholders: PRIMARY_STATUS_OPTIONS.reduce(
        (sum, p) => sum + bp[p].count,
        0,
      ),
      totalStocks: PRIMARY_STATUS_OPTIONS.reduce(
        (sum, p) => sum + bp[p].stocks,
        0,
      ),
    }))
    .sort((a, b) => a.company.localeCompare(b.company, "ko"))

  return {
    totalShareholders: rows.length,
    totalStocks,
    completedShareholders: completedRows.length,
    completedStocks,
    byPrimary,
    byCompanyPrimary,
  }
}

export const useShareholderStats = (params: ShareholdersParams) => {
  const enabled = !!(params.listId || (params.listIds?.length ?? 0) > 0)

  return useQuery({
    queryKey: [
      "shareholderStats",
      params.listId,
      params.listIds,
      params.status,
      params.statusPrimaryFilter,
      params.company,
      params.maker,
      params.city,
      params.stocks,
      params.companyStockFilterMap,
      params.companyFilterProfiles,
      params.lat,
      params.lng,
      params.mapLevel,
      params.search,
      params.photoFilter,
      params.geocodeStatusFilter,
    ],
    queryFn: () => getShareholderStats(params),
    enabled,
  })
}

export type FilterMenuForLists = {
  statusMenu: string[]
  companyMenu: string[]
}

const getFilterMenuForLists = async (
  listIds: string[],
): Promise<FilterMenuForLists> => {
  if (listIds.length === 0) {
    return { statusMenu: [], companyMenu: [] }
  }

  const query = supabase
    .from("shareholders")
    .select("status, company")
    .in("list_id", listIds)
  const { data, error } = await query
  if (error) {
    reportError(error)

    return { statusMenu: [], companyMenu: [] }
  }
  const rows = data ?? []
  const statusMenu = [
    ...new Set(rows.map((r) => r.status).filter(Boolean)),
  ] as string[]
  const companyMenu = [
    ...new Set(rows.map((r) => r.company).filter(Boolean)),
  ] as string[]

  return { statusMenu, companyMenu }
}

export const useFilterMenuForLists = (listIds: string[] | null) => {
  const hasLists = Array.isArray(listIds) && listIds.length > 0

  return useQuery({
    queryKey: ["filterMenuForLists", listIds],
    queryFn: () => getFilterMenuForLists(listIds ?? []),
    enabled: hasLists,
  })
}

export const useShareholders = (params: ShareholdersParams) => {
  const hasLists = !!(params.listId || (params.listIds?.length ?? 0) > 0)
  const searchGate = !params.requireSearchToFetch || !!params.search?.trim()
  const enabled = hasLists && searchGate

  return useQuery({
    queryKey: [
      "shareholders",
      params.listId,
      params.listIds,
      params.status,
      params.statusPrimaryFilter,
      params.company,
      params.maker,
      params.city,
      params.stocks,
      params.companyStockFilterMap,
      params.companyFilterProfiles,
      params.lat,
      params.lng,
      params.mapLevel,
      params.search,
      params.requireSearchToFetch,
      params.photoFilter,
      params.geocodeStatusFilter,
    ],
    queryFn: () => getShareholders(params),
    enabled,
    placeholderData: keepPreviousData,
  })
}

const getShareholderById = async (
  shareholderId: string,
): Promise<Shareholder | null> => {
  const { data, error } = await supabase
    .from("shareholders")
    .select("*")
    .eq("id", shareholderId)
    .maybeSingle()
  if (error) {
    reportError(error)
    throw new Error(error.message)
  }

  return data ?? null
}

/** 지도 `?highlight=` 진입 시 뷰포트 밖 주주 한 건을 마커에 합치기 위한 조회 */
export const useShareholderById = (shareholderId: string | null) => {
  return useQuery({
    queryKey: ["shareholderById", shareholderId],
    queryFn: () =>
      shareholderId ? getShareholderById(shareholderId) : Promise.resolve(null),
    enabled: !!shareholderId,
    staleTime: 1000 * 60,
  })
}

export type CreateShareholderInput = {
  list_id: string
  name?: string | null
  company?: string | null
  address?: string | null
  status?: string | null
  stocks?: number
  memo?: string | null
  phone?: string | null
  maker?: string | null
  lat?: number | null
  lng?: number | null
  latlngaddress?: string | null
}

export const useCreateShareholder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateShareholderInput) => {
      const { data, error } = await supabase
        .from("shareholders")
        .insert({
          list_id: input.list_id,
          name: input.name ?? null,
          company: input.company ?? null,
          address: input.address ?? null,
          status: input.status ?? "미방문",
          stocks: input.stocks ?? 0,
          memo: input.memo ?? null,
          phone: input.phone ?? null,
          maker: input.maker ?? null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          latlngaddress: input.latlngaddress ?? null,
        })
        .select()
        .single()
      if (error) throw error

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["shareholders", { listId: variables.list_id }],
      })
      toast.success("주주가 추가되었습니다.")
    },
    onError: () => {
      toast.error("주주 추가에 실패했습니다.")
    },
  })
}

export const useCreateShareholderList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      workspace_id: string
      name: string
      active_from?: string | null
      active_to?: string | null
      is_visible?: boolean
    }) => {
      const { data, error } = await supabase
        .from("shareholder_lists")
        .insert(input)
        .select()
        .single()
      if (error) throw error

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["shareholderLists", variables.workspace_id],
      })
      toast.success("주주명부가 생성되었습니다.")
    },
    onError: () => {
      toast.error("주주명부 생성에 실패했습니다.")
    },
  })
}

export const useUpdateShareholderList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Partial<ShareholderList> & { id: string }) => {
      const { id, ...rest } = input
      const { data, error } = await supabase
        .from("shareholder_lists")
        .update(rest)
        .eq("id", id)
        .select()
        .maybeSingle()
      if (error) throw error

      return requireSupabaseRow(
        data,
        "주주명부를 수정할 수 없습니다. 로그인 상태와 권한을 확인해 주세요.",
      )
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["shareholderLists", data.workspace_id],
      })
      toast.success("저장되었습니다.")
    },
    onError: () => {
      toast.error("저장에 실패했습니다.")
    },
  })
}

export const useDeleteShareholderList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; workspace_id: string }) => {
      const { error } = await supabase
        .from("shareholder_lists")
        .delete()
        .eq("id", input.id)
      if (error) throw error

      return input
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["shareholderLists", variables.workspace_id],
      })
      toast.success("주주명부가 삭제되었습니다.")
    },
    onError: () => {
      toast.error("주주명부 삭제에 실패했습니다.")
    },
  })
}

/** 서버(Vercel) 로그에 없을 수 있음 — Sentry에서 `shareholder_change_history` 태그로 조회 */
function logChangeHistoryClientSkip(
  reason: "no_access_token",
  detail: {
    shareholderId: string
    entryCount: number
    fields: string[]
  },
): void {
  Sentry.withScope((scope) => {
    scope.setTag("area", "shareholder_change_history")
    scope.setContext("change_history_client_skip", { reason, ...detail })
    Sentry.captureMessage(
      `shareholder_change_history: client skip (${reason})`,
      "warning",
    )
  })
}

/** Record change history via API (지도 쪽 RLS 대신 서버 경유로 기록) */
const recordChangeHistoryViaApi = async (
  shareholderId: string,
  accessToken: string,
  entries: Array<{
    field: string
    old_value: string | null
    new_value: string | null
  }>,
): Promise<void> => {
  if (entries.length === 0) return
  const url = `/api/workspace/shareholders/${encodeURIComponent(shareholderId)}/change-history`
  const res = await axiosWithBearerRetry(accessToken, (token) =>
    apiClient.post(url, { entries }, { headers: bearerHeaders(token) }),
  )
  if (!isHttpOk(res.status)) {
    const message = apiErrorMessageFromHttpResponse(
      res,
      res.statusText || "Change history failed",
    )
    const userMessage =
      "변경 이력을 먼저 저장하지 못했습니다. 주주 정보 변경은 반영되지 않았습니다."
    const context = {
      shareholder_change_history_api: {
        shareholderId,
        requestUrl: url,
        httpStatus: res.status,
        errorMessage: message,
        entryCount: entries.length,
        fields: entries.map((e) => e.field),
      },
    }

    /** 401/403 은 세션·권한 — Sentry 노이즈 제외 (감사 리포트 F·httpReporting 정책과 동일) */
    if (shouldReportSentryForHttpStatus(res.status)) {
      reportError(new Error(message), { context, toastMessage: undefined })
    }
    throw new Error(userMessage)
  }
}

export const usePatchShareholder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      patch: Partial<Shareholder> & { id: string }
      userId: string
    }) => {
      const { patch, userId: _userId } = input
      const { id, ...rest } = patch
      type ShareholderKey = keyof Omit<Shareholder, "id">
      const fields = Object.keys(rest) as ShareholderKey[]
      const entries: Array<{
        field: string
        old_value: string | null
        new_value: string | null
      }> = []
      for (const field of fields) {
        const newVal = rest[field]
        const oldRow = await supabase
          .from("shareholders")
          .select(field)
          .eq("id", id)
          .maybeSingle()
        if (oldRow.error) throw oldRow.error
        const raw = requireSupabaseRow(
          oldRow.data as Record<string, unknown> | null,
          "주주 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.",
        )
        const val = raw?.[field]
        const oldVal = toHistoryValue(val)
        const newStr = toHistoryValue(newVal)
        if (oldVal !== newStr) {
          entries.push({ field, old_value: oldVal, new_value: newStr })
        }
      }
      // 캐시된 session.access_token은 만료돼도 남을 수 있음 → 변경 이력 POST는 항상 getAccessToken(갱신 포함)
      // 변경 이력이 필요하면 API 성공 후에만 shareholders update (원자적 UX)
      if (entries.length > 0) {
        let tokenForHistory = await getAccessToken()
        if (!tokenForHistory) {
          tokenForHistory = await recoverAccessTokenAfterAuthFailure()
        }
        if (!tokenForHistory) {
          logChangeHistoryClientSkip("no_access_token", {
            shareholderId: id,
            entryCount: entries.length,
            fields: entries.map((e) => e.field),
          })
          throw new Error(
            "인증 세션이 없어 변경 이력을 저장할 수 없습니다. 로그인 후 다시 시도해 주세요.",
          )
        }
        await recordChangeHistoryViaApi(id, tokenForHistory, entries)
      }
      const { data, error } = await supabase
        .from("shareholders")
        .update(rest)
        .eq("id", id)
        .select()
        .maybeSingle()
      if (error) throw error

      return requireSupabaseRow(
        data,
        "저장에 실패했습니다. 로그인 상태와 권한을 확인해 주세요.",
      )
    },
    onSuccess: (data, variables) => {
      if (data) {
        const id = String(variables.patch.id)
        queryClient.setQueriesData({ queryKey: ["shareholders"] }, (old) => {
          if (!Array.isArray(old)) return old
          let hit = false
          const next = (old as Shareholder[]).map((row) => {
            if (String(row.id) !== id) return row
            hit = true

            return { ...row, ...data }
          })

          return hit ? next : old
        })
      }
      queryClient.invalidateQueries({ queryKey: ["shareholders"] })
      queryClient.invalidateQueries({ queryKey: ["changesForList"] })
      queryClient.invalidateQueries({
        queryKey: ["shareholderChangeHistoryForMap", variables.patch.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["shareholderChangeHistory", variables.patch.id],
      })
    },
    onError: () => {
      // 호출부에서 화면 맥락에 맞는 에러 메시지를 직접 표시한다.
    },
  })
}

export const useDeleteShareholder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shareholders")
        .delete()
        .eq("id", id)
      if (error) throw error

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareholders"] })
      queryClient.invalidateQueries({ queryKey: ["changesForList"] })
    },
    onError: () => {
      toast.error("삭제에 실패했습니다.")
    },
  })
}

export type LatestChange = { changed_by: string; changed_at: string }
export type ChangeEntry = {
  changed_by: string
  changed_at: string
  field: string
  old_value: string | null
  new_value: string | null
}

export type ListChangesResult = {
  latest: Record<string, LatestChange>
  all: Record<string, ChangeEntry[]>
}

const getChangesForList = async (
  listId: string,
): Promise<ListChangesResult> => {
  const { data, error } = await supabase
    .from("shareholder_change_history")
    .select(
      "shareholder_id, changed_by, changed_at, field, old_value, new_value, shareholders!inner(list_id)",
    )
    .eq("shareholders.list_id", listId)
    .order("changed_at", { ascending: false })

  if (error) {
    reportError(error)

    return { latest: {}, all: {} }
  }

  const latest: Record<string, LatestChange> = {}
  const all: Record<string, ChangeEntry[]> = {}

  for (const row of data ?? []) {
    if (!latest[row.shareholder_id]) {
      latest[row.shareholder_id] = {
        changed_by: row.changed_by,
        changed_at: row.changed_at,
      }
    }
    const entry: ChangeEntry = {
      changed_by: row.changed_by,
      changed_at: row.changed_at,
      field: row.field,
      old_value: row.old_value,
      new_value: row.new_value,
    }
    ;(all[row.shareholder_id] ??= []).push(entry)
  }

  return { latest, all }
}

export const useChangesForList = (listId: string | null) => {
  return useQuery({
    queryKey: ["changesForList", listId],
    queryFn: () =>
      listId ? getChangesForList(listId) : { latest: {}, all: {} },
    enabled: !!listId,
    staleTime: 1000 * 60,
  })
}

/** GET /change-history — changed_by UUID를 사용자 이름·이메일로 풀어줌 */
export type ChangeHistoryUserLookup = Record<
  string,
  { name: string | null; email: string | null }
>

export type ShareholderChangeHistoryResolved = {
  rows: Tables<"shareholder_change_history">[]
  changedByUser: ChangeHistoryUserLookup
}

async function fetchShareholderChangeHistoryApiJson(
  shareholderId: string,
  options?: { forMap?: boolean },
): Promise<ShareholderChangeHistoryResolved | null> {
  const q = options?.forMap ? "?forMap=1" : ""
  const url = `/api/workspace/shareholders/${encodeURIComponent(shareholderId)}/change-history${q}`
  let token = await getAccessToken()
  if (!token) {
    token = (await recoverAccessTokenAfterAuthFailure()) ?? ""
  }
  if (!token) return null
  const res = await axiosWithBearerRetry(token, (t) =>
    apiClient.get(url, { headers: bearerHeaders(t) }),
  )
  if (!isHttpOk(res.status)) return null
  const json = res.data as {
    history?: Tables<"shareholder_change_history">[]
    changedByUser?: ChangeHistoryUserLookup
  }

  return {
    rows: json.history ?? [],
    changedByUser: json.changedByUser ?? {},
  }
}

export const useShareholderChangeHistory = (shareholderId: string | null) => {
  return useQuery({
    queryKey: ["shareholderChangeHistory", shareholderId],
    queryFn: async () => {
      if (!shareholderId) {
        return { rows: [], changedByUser: {} }
      }
      const parsed = await fetchShareholderChangeHistoryApiJson(shareholderId)

      return (
        parsed ?? {
          rows: [],
          changedByUser: {},
        }
      )
    },
    enabled: !!shareholderId,
    staleTime: 1000 * 60 * 2,
  })
}

/** API 응답 row */
type ChangeHistoryRow = {
  changed_at: string
  changed_by: string
  field: string
  old_value: string | null
  new_value: string | null
}

/** 지도용: API로 변경 이력 조회 후 HistoryItem[] 형태로 변환 */
export type ShareholderChangeHistoryForMapItem = {
  modified_at: string
  modifier: string
  changes: {
    memo?: { original: string; modified: string }
    phone?: { original: string; modified: string }
    status?: { original: string; modified: string }
  }
}

async function fetchShareholderChangeHistoryForMap(
  shareholderId: string,
): Promise<ShareholderChangeHistoryForMapItem[]> {
  const parsed = await fetchShareholderChangeHistoryApiJson(shareholderId, {
    forMap: true,
  })
  if (!parsed || parsed.rows.length === 0) return []
  const rows = parsed.rows as ChangeHistoryRow[]
  const changedByUser = parsed.changedByUser
  const key = (r: ChangeHistoryRow) => `${r.changed_at}\t${r.changed_by}`
  const groups = new Map<string, ChangeHistoryRow[]>()
  for (const r of rows) {
    const k = key(r)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r)
  }
  const result: ShareholderChangeHistoryForMapItem[] = []
  const sortedKeys = [...groups.keys()].sort(
    (a, b) =>
      new Date(b.split("\t")[0]).getTime() -
      new Date(a.split("\t")[0]).getTime(),
  )
  for (const k of sortedKeys) {
    const group = groups.get(k)!
    const first = group[0]
    const user = changedByUser[first.changed_by]
    const modifier = user?.name ?? user?.email ?? "알 수 없음"
    const changes: ShareholderChangeHistoryForMapItem["changes"] = {}
    for (const r of group) {
      if (r.field === "memo") {
        changes.memo = {
          original: r.old_value ?? "",
          modified: r.new_value ?? "",
        }
      }
      if (r.field === "phone") {
        changes.phone = {
          original: r.old_value ?? "",
          modified: r.new_value ?? "",
        }
      }
      if (r.field === "status") {
        changes.status = {
          original: r.old_value ?? "",
          modified: r.new_value ?? "",
        }
      }
    }
    result.push({
      modified_at: new Date(first.changed_at).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      modifier,
      changes,
    })
  }

  return result
}

export const useShareholderChangeHistoryForMap = (
  shareholderId: string | null,
  options?: { enabled?: boolean },
) => {
  const enabled = !!shareholderId && options?.enabled !== false

  return useQuery({
    queryKey: ["shareholderChangeHistoryForMap", shareholderId, "light"],
    queryFn: () =>
      shareholderId
        ? fetchShareholderChangeHistoryForMap(shareholderId)
        : Promise.resolve([]),
    enabled,
    staleTime: 1000 * 60 * 2,
  })
}

/** 모바일 시트 오픈 직전 prefetch로 체감 지연을 줄인다. */
export const prefetchShareholderChangeHistoryForMap = async (
  queryClient: QueryClient,
  shareholderId: string | null,
): Promise<void> => {
  if (!shareholderId) return
  await queryClient.prefetchQuery({
    queryKey: ["shareholderChangeHistoryForMap", shareholderId, "light"],
    queryFn: () => fetchShareholderChangeHistoryForMap(shareholderId),
    staleTime: 1000 * 60 * 2,
  })
}
