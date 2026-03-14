import { useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-toastify"
import supabase from "@/lib/supabase/supabaseClient"
import type { Tables } from "@/types/db"
import * as Sentry from "@sentry/nextjs"
import { getCoordinateRanges } from "@/lib/utils"

type ShareholderList = Tables<"shareholder_lists">
type Shareholder = Tables<"shareholders">

function toHistoryValue(v: unknown): string | null {
  if (v === null || v === undefined) {
    return null
  }
  if (typeof v === "string") {
    return v
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return String(v)
  }

  return JSON.stringify(v)
}

const getShareholderLists = async (workspaceId: string) => {
  const { data, error } = await supabase
    .from("shareholder_lists")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
  if (error) {
    Sentry.captureException(error)
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
    Sentry.captureException(error)
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
    Sentry.captureException(error)
    throw new Error(error.message)
  }

  return data ?? []
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

const recordChangeHistory = async (
  shareholderId: string,
  userId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
) => {
  await supabase.from("shareholder_change_history").insert({
    shareholder_id: shareholderId,
    changed_by: userId,
    field,
    old_value: oldValue,
    new_value: newValue,
  })
}

export const usePatchShareholder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      patch: Partial<Shareholder> & { id: string }
      userId: string
    }) => {
      const { patch, userId } = input
      const { id, ...rest } = patch
      type ShareholderKey = keyof Omit<Shareholder, "id">
      const fields = Object.keys(rest) as ShareholderKey[]
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
          await recordChangeHistory(id, userId, field, oldVal, newStr)
        }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareholders"] })
      queryClient.invalidateQueries({ queryKey: ["excel"] })
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
      queryClient.invalidateQueries({ queryKey: ["excel"] })
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
    Sentry.captureException(error)

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
