import { createSupabaseWithToken } from "@/lib/supabase/supabaseServer"
import { getBearerToken, getAuthUser } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

export default withApiHandler(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const { listId } = req.query
  if (typeof listId !== "string") {
    return res.status(400).json({ error: "listId required" })
  }
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const auth = await getAuthUser(token)
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
    .select("id, name")
    .eq("list_id", listId)
  const shareholderIds = (shareholders ?? []).map((s) => s.id)
  const nameById = Object.fromEntries(
    (shareholders ?? []).map((s) => [s.id, s.name ?? s.id]),
  )

  if (shareholderIds.length === 0) {
    return res.status(200).json({ history: [], nameById: {} })
  }

  const { data: history } = await client
    .from("shareholder_change_history")
    .select("*")
    .in("shareholder_id", shareholderIds)
    .order("changed_at", { ascending: false })
    .limit(200)

  return res.status(200).json({ history: history ?? [], nameById })
})
