import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"
import { getBearerToken, getAuthUser } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"
import {
  entriesPreviewForLog,
  logShareholderChangeHistory,
} from "@/lib/server/shareholderChangeHistoryLog"

/** Check user is member of shareholder's workspace; return workspaceId or null */
async function getShareholderWorkspaceAndAuth(
  shareholderId: string,
  userId: string,
): Promise<{ workspaceId: string } | null> {
  const admin = createSupabaseAdmin()

  const { data: shareholder } = await admin
    .from("shareholders")
    .select("id, list_id")
    .eq("id", shareholderId)
    .single()
  if (!shareholder?.list_id) return null

  const { data: list } = await admin
    .from("shareholder_lists")
    .select("workspace_id")
    .eq("id", shareholder.list_id)
    .single()
  if (!list?.workspace_id) return null

  const { data: member } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", list.workspace_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (!member) return null

  return { workspaceId: list.workspace_id }
}

export default withApiHandler(async (req, res) => {
  const shareholderId = req.query.shareholderId as string
  if (!shareholderId) {
    logShareholderChangeHistory(req, {
      scope: "shareholder_change_history",
      phase: "bad_request",
      shareholderId: "(missing)",
      method: req.method ?? "?",
      httpStatus: 400,
    })

    return res.status(400).json({ error: "shareholderId required" })
  }

  const token = getBearerToken(req)
  if (!token) {
    logShareholderChangeHistory(req, {
      scope: "shareholder_change_history",
      phase: "auth_no_bearer",
      shareholderId,
      method: req.method ?? "?",
      httpStatus: 401,
    })

    return res.status(401).json({ error: "Unauthorized" })
  }
  const auth = await getAuthUser(token)
  if (!auth) {
    logShareholderChangeHistory(req, {
      scope: "shareholder_change_history",
      phase: "auth_invalid_token",
      shareholderId,
      method: req.method ?? "?",
      httpStatus: 401,
    })

    return res.status(401).json({ error: "Unauthorized" })
  }
  const { user } = auth

  const scope = await getShareholderWorkspaceAndAuth(shareholderId, user.id)
  if (!scope) {
    logShareholderChangeHistory(req, {
      scope: "shareholder_change_history",
      phase: "scope_denied",
      shareholderId,
      method: req.method ?? "?",
      userId: user.id,
      httpStatus: 404,
    })

    return res
      .status(404)
      .json({ error: "Shareholder not found or access denied" })
  }

  if (req.method === "GET") {
    const client = createSupabaseWithToken(token)
    const { data: history, error: historyError } = await client
      .from("shareholder_change_history")
      .select("*")
      .eq("shareholder_id", shareholderId)
      .order("changed_at", { ascending: false })

    if (historyError) {
      logShareholderChangeHistory(req, {
        scope: "shareholder_change_history",
        phase: "get_error",
        shareholderId,
        method: "GET",
        userId: user.id,
        workspaceId: scope.workspaceId,
        dbError: {
          code: historyError.code,
          message: historyError.message,
          details: historyError.details ?? undefined,
        },
        httpStatus: 500,
      })

      return res.status(500).json({ error: historyError.message })
    }

    const rows = history ?? []
    logShareholderChangeHistory(req, {
      scope: "shareholder_change_history",
      phase: "get_ok",
      shareholderId,
      method: "GET",
      userId: user.id,
      workspaceId: scope.workspaceId,
      entryCount: rows.length,
      httpStatus: 200,
    })

    const changedByIds = [
      ...new Set(rows.map((r: { changed_by: string }) => r.changed_by)),
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

    return res.status(200).json({ history: rows, changedByUser })
  }

  if (req.method === "POST") {
    const body = req.body as {
      entries?: Array<{
        field: string
        old_value: string | null
        new_value: string | null
      }>
    }
    const entries = Array.isArray(body?.entries) ? body.entries : []
    if (entries.length === 0) {
      logShareholderChangeHistory(req, {
        scope: "shareholder_change_history",
        phase: "post_skip_empty",
        shareholderId,
        method: "POST",
        userId: user.id,
        workspaceId: scope.workspaceId,
        entryCount: 0,
        httpStatus: 200,
      })

      return res.status(200).json({ success: true })
    }

    const fields = entries.map((e) => String(e.field))
    const entriesPreview = entriesPreviewForLog(entries)
    logShareholderChangeHistory(req, {
      scope: "shareholder_change_history",
      phase: "post_start",
      shareholderId,
      method: "POST",
      userId: user.id,
      workspaceId: scope.workspaceId,
      fields,
      entriesPreview,
      entryCount: entries.length,
    })

    const admin = createSupabaseAdmin()
    const toInsert = entries.map((e) => ({
      shareholder_id: shareholderId,
      changed_by: user.id,
      field: String(e.field),
      old_value: e.old_value ?? null,
      new_value: e.new_value ?? null,
    }))

    const { error: insertError } = await admin
      .from("shareholder_change_history")
      .insert(toInsert)

    if (insertError) {
      logShareholderChangeHistory(req, {
        scope: "shareholder_change_history",
        phase: "post_insert_error",
        shareholderId,
        method: "POST",
        userId: user.id,
        workspaceId: scope.workspaceId,
        fields,
        entriesPreview,
        entryCount: entries.length,
        dbError: {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details ?? undefined,
        },
        httpStatus: 500,
      })

      return res.status(500).json({ error: insertError.message })
    }

    logShareholderChangeHistory(req, {
      scope: "shareholder_change_history",
      phase: "post_insert_ok",
      shareholderId,
      method: "POST",
      userId: user.id,
      workspaceId: scope.workspaceId,
      fields,
      entriesPreview,
      entryCount: entries.length,
      httpStatus: 201,
    })

    return res.status(201).json({ success: true })
  }

  logShareholderChangeHistory(req, {
    scope: "shareholder_change_history",
    phase: "method_not_allowed",
    shareholderId,
    method: req.method ?? "?",
    userId: user.id,
    workspaceId: scope.workspaceId,
    httpStatus: 405,
  })

  return res.status(405).json({ error: "Method not allowed" })
})
