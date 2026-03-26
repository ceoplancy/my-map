import {
  createSupabaseWithToken,
  createSupabaseAdmin,
} from "@/lib/supabase/supabaseServer"
import { getAuthUserFromApiRequest } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

/** shareholders inner join 응답에서 제거하기 위한 형태 */
type ChangeHistoryJoinedRow = {
  id: string
  shareholder_id: string
  changed_by: string
  changed_at: string
  field: string
  old_value: string | null
  new_value: string | null
  shareholders: { list_id: string }
}

export default withApiHandler(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const { listId } = req.query
  if (typeof listId !== "string") {
    return res.status(400).json({ error: "listId required" })
  }
  const auth = await getAuthUserFromApiRequest(req, res)
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const { user, token: accessToken } = auth
  const client = createSupabaseWithToken(accessToken)

  const { data: list } = await client
    .from("shareholder_lists")
    .select("workspace_id")
    .eq("id", listId)
    .single()
  if (!list?.workspace_id) {
    return res.status(404).json({ error: "List not found" })
  }

  const { data: member } = await client
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", list.workspace_id)
    .eq("user_id", user.id)
    .single()
  if (!member) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const { data: shareholders } = await client
    .from("shareholders")
    .select("id, name, company")
    .eq("list_id", listId)
  const shareholderIds = (shareholders ?? []).map((s) => s.id)
  const nameById = Object.fromEntries(
    (shareholders ?? []).map((s) => {
      const parts = [s.company?.trim(), s.name?.trim()].filter(Boolean)
      const label = parts.length > 0 ? parts.join(" · ") : (s.id ?? "")

      return [s.id, label]
    }),
  )

  if (shareholderIds.length === 0) {
    return res.status(200).json({
      history: [],
      total: 0,
      nameById: {},
      changedByUser: {},
    })
  }

  /**
   * 명부 전체 변경 이력 조회.
   * `.in("shareholder_id", ids)`는 주주 수가 많을 때 쿼리 URL이 비대해져 PostgREST fetch가 실패할 수 있음
   * (로컬에서 `TypeError: fetch failed` / 500). shareholders와 inner join으로 list_id만 필터한다.
   */
  const MAX_ROWS = 8000

  const {
    data: historyJoined,
    count: totalCount,
    error: historyError,
  } = await client
    .from("shareholder_change_history")
    .select(
      `
      id,
      shareholder_id,
      changed_by,
      changed_at,
      field,
      old_value,
      new_value,
      shareholders!inner(list_id)
    `,
      { count: "exact" },
    )
    .eq("shareholders.list_id", listId)
    .order("changed_at", { ascending: false })
    .limit(MAX_ROWS)

  if (historyError) {
    return res.status(500).json({ error: historyError.message })
  }

  const historyRows = (historyJoined ?? []).map((row) => {
    const { shareholders: _s, ...rest } = row as ChangeHistoryJoinedRow

    return rest
  })
  const total = totalCount ?? historyRows.length
  const changedByIds = [
    ...new Set(historyRows.map((r: { changed_by: string }) => r.changed_by)),
  ]
  const admin = createSupabaseAdmin()
  const authUsers = await Promise.all(
    changedByIds.map((uid) => admin.auth.admin.getUserById(uid)),
  )
  const changedByUser: Record<
    string,
    { name: string | null; email: string | null }
  > = {}
  changedByIds.forEach((uid, i) => {
    const u = authUsers[i]?.data?.user
    const email =
      (u?.email as string) ?? (u?.user_metadata?.email as string) ?? null
    const name =
      (u?.user_metadata?.name as string) ??
      (u?.user_metadata?.full_name as string) ??
      null
    changedByUser[uid] = { name: name ?? null, email: email ?? null }
  })

  return res.status(200).json({
    history: historyRows,
    total,
    truncated: total > historyRows.length,
    nameById,
    changedByUser,
  })
})
