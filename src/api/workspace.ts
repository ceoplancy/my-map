import { useMemo } from "react"
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import * as Sentry from "@sentry/nextjs"
import { toast } from "react-toastify"
import supabase from "@/lib/supabase/supabaseClient"
import type { Tables } from "@/types/db"
import { apiErrorMessageFromBody } from "@/lib/apiErrorMessage"
import { shouldReportSentryForHttpStatus } from "@/lib/httpReporting"
import { reportError } from "@/lib/reportError"
import { truncateChangeHistoryValue } from "@/lib/shareholderChangeHistoryValues"
import { getCoordinateRanges } from "@/lib/utils"

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
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return []
  const res = await fetch(
    `/api/me/workspace-members?workspaceId=${encodeURIComponent(workspaceId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return []
  const json = await res.json()

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
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
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

      const res = await fetch("/api/me/workspace-members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }))
        throw new Error(
          apiErrorMessageFromBody(err, res.statusText || "Request failed"),
        )
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
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error("Unauthorized")
      const res = await fetch(
        `/api/me/workspace-members?workspaceId=${encodeURIComponent(workspaceId)}&memberId=${encodeURIComponent(memberId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(
          apiErrorMessageFromBody(err, res.statusText || "Request failed"),
        )
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

export const useShareholderLists = (workspaceId: string | null) => {
  return useQuery({
    queryKey: ["shareholderLists", workspaceId],
    queryFn: () =>
      workspaceId ? getShareholderLists(workspaceId) : Promise.resolve([]),
    enabled: !!workspaceId,
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

type ShareholdersParams = {
  listId?: string | null
  listIds?: string[] | null
  status?: string[]
  company?: string[]
  maker?: string | null
  city?: string
  stocks?: { start: number; end: number }[]
  lat?: number
  lng?: number
  mapLevel?: number
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
  if (params.status?.length) {
    query = query.in("status", params.status)
  }
  if (params.company?.length) {
    query = query.in("company", params.company)
  }
  if (params.maker) {
    query = query.eq("maker", params.maker)
  }
  if (params.city) {
    query = query.like("address", `%${params.city}%`)
  }
  if (params.stocks?.length) {
    const conditions = params.stocks
      .map((r) => `and(stocks.gte.${r.start},stocks.lte.${r.end})`)
      .join(",")
    query = query.or(conditions)
  }
  if (params.lat != null && params.lng != null && params.mapLevel != null) {
    const { latRange, lngRange } = getCoordinateRanges(params.mapLevel)
    query = query.gte("lat", params.lat - latRange)
    query = query.lte("lat", params.lat + latRange)
    query = query.gte("lng", params.lng - lngRange)
    query = query.lte("lng", params.lng + lngRange)
  }
  const { data, error } = await query
  if (error) {
    reportError(error)
    throw new Error(error.message)
  }

  return data ?? []
}

export type ShareholderStats = {
  totalShareholders: number
  totalStocks: number
  completedShareholders: number
  completedStocks: number
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
    }
  }

  let query = supabase.from("shareholders").select("status, stocks")
  if (listIds.length === 1) {
    query = query.eq("list_id", listIds[0])
  } else {
    query = query.in("list_id", listIds)
  }
  if (params.status?.length) {
    query = query.in("status", params.status)
  }
  if (params.company?.length) {
    query = query.in("company", params.company)
  }
  if (params.city) {
    query = query.like("address", `%${params.city}%`)
  }
  if (params.stocks?.length) {
    const conditions = params.stocks
      .map((r) => `and(stocks.gte.${r.start},stocks.lte.${r.end})`)
      .join(",")
    query = query.or(conditions)
  }
  const { data, error } = await query
  if (error) {
    reportError(error)
    throw new Error(error.message)
  }
  const rows = data ?? []
  const totalStocks = rows.reduce((sum, r) => sum + (Number(r.stocks) || 0), 0)
  const completedRows = rows.filter((r) => r.status === "완료")
  const completedStocks = completedRows.reduce(
    (sum, r) => sum + (Number(r.stocks) || 0),
    0,
  )

  return {
    totalShareholders: rows.length,
    totalStocks,
    completedShareholders: completedRows.length,
    completedStocks,
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
      params.company,
      params.city,
      params.stocks,
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
  const enabled = !!(params.listId || (params.listIds?.length ?? 0) > 0)

  return useQuery({
    queryKey: [
      "shareholders",
      params.listId,
      params.listIds,
      params.status,
      params.company,
      params.maker,
      params.city,
      params.stocks,
      params.lat,
      params.lng,
      params.mapLevel,
    ],
    queryFn: () => getShareholders(params),
    enabled,
    placeholderData: keepPreviousData,
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
        .single()
      if (error) throw error

      return data
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
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ entries }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }))
    const message = apiErrorMessageFromBody(
      errBody as { error?: unknown },
      res.statusText || "Change history failed",
    )
    const toastMessage =
      "변경 이력 기록에 실패했습니다. 주주 정보는 저장되었습니다."
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
      reportError(new Error(message), { toastMessage, context })
    } else {
      toast.error(toastMessage)
    }
  }
}

export const usePatchShareholder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      patch: Partial<Shareholder> & { id: string }
      userId: string
      accessToken?: string | null
    }) => {
      const { patch, userId: _userId, accessToken } = input
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
          .single()
        const raw = oldRow.data as Record<string, unknown> | null
        const val = raw?.[field]
        const oldVal = toHistoryValue(val)
        const newStr = toHistoryValue(newVal)
        if (oldVal !== newStr) {
          entries.push({ field, old_value: oldVal, new_value: newStr })
        }
      }
      // 호출부에서 session 캐시가 비어 있어도, 저장 직전 getSession()으로 토큰 보강 (변경 이력 누락 방지)
      let tokenForHistory = accessToken ?? null
      if (entries.length > 0 && !tokenForHistory) {
        const { data: sessionData } = await supabase.auth.getSession()
        tokenForHistory = sessionData.session?.access_token ?? null
      }
      if (entries.length > 0 && tokenForHistory) {
        await recordChangeHistoryViaApi(id, tokenForHistory, entries)
      } else if (entries.length > 0 && !tokenForHistory) {
        logChangeHistoryClientSkip("no_access_token", {
          shareholderId: id,
          entryCount: entries.length,
          fields: entries.map((e) => e.field),
        })
      }
      const { data, error } = await supabase
        .from("shareholders")
        .update(rest)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error

      return data
    },
    onSuccess: (_, variables) => {
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
      toast.error("저장에 실패했습니다.")
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

const getShareholderChangeHistory = async (
  shareholderId: string,
): Promise<Tables<"shareholder_change_history">[]> => {
  const { data, error } = await supabase
    .from("shareholder_change_history")
    .select("*")
    .eq("shareholder_id", shareholderId)
    .order("changed_at", { ascending: false })
  if (error) {
    reportError(error)

    return []
  }

  return data ?? []
}

export const useShareholderChangeHistory = (shareholderId: string | null) => {
  return useQuery({
    queryKey: ["shareholderChangeHistory", shareholderId],
    queryFn: () =>
      shareholderId
        ? getShareholderChangeHistory(shareholderId)
        : Promise.resolve([]),
    enabled: !!shareholderId,
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
    status?: { original: string; modified: string }
  }
}

async function fetchShareholderChangeHistoryForMap(
  shareholderId: string,
): Promise<ShareholderChangeHistoryForMapItem[]> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return []
  const res = await fetch(
    `/api/workspace/shareholders/${encodeURIComponent(shareholderId)}/change-history`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return []
  const json = (await res.json()) as {
    history?: ChangeHistoryRow[]
    changedByUser?: Record<
      string,
      { name: string | null; email: string | null }
    >
  }
  const rows = json.history ?? []
  const changedByUser = json.changedByUser ?? {}
  if (rows.length === 0) return []
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
    queryKey: ["shareholderChangeHistoryForMap", shareholderId],
    queryFn: () =>
      shareholderId
        ? fetchShareholderChangeHistoryForMap(shareholderId)
        : Promise.resolve([]),
    enabled,
    staleTime: 1000 * 60 * 2,
  })
}
