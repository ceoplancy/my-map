import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/db"

type Db = SupabaseClient<Database>

/**
 * 워크스페이스 멤버가 해당 명부에 접근 가능한지(현장요원은 allowed_list_ids).
 * `shareholders.list_id` 로 주주가 명부에 속하는지 함께 검증할 때 사용.
 */
export async function assertUserCanAccessShareholderList(
  client: Db,
  userId: string,
  listId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: list, error: listErr } = await client
    .from("shareholder_lists")
    .select("id, workspace_id")
    .eq("id", listId)
    .maybeSingle()
  if (listErr || !list?.workspace_id) {
    return { ok: false, message: "명부를 찾을 수 없습니다." }
  }

  const { data: member, error: memErr } = await client
    .from("workspace_members")
    .select("id, role, allowed_list_ids")
    .eq("workspace_id", list.workspace_id)
    .eq("user_id", userId)
    .maybeSingle()
  if (memErr || !member) {
    return { ok: false, message: "이 워크스페이스에 대한 권한이 없습니다." }
  }

  if (
    member.role === "field_agent" &&
    member.allowed_list_ids &&
    member.allowed_list_ids.length > 0
  ) {
    const allowed = new Set(member.allowed_list_ids)
    if (!allowed.has(listId)) {
      return { ok: false, message: "이 명부에 대한 권한이 없습니다." }
    }
  }

  return { ok: true }
}

export async function assertShareholderBelongsToList(
  client: Db,
  listId: string,
  shareholderId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: row, error } = await client
    .from("shareholders")
    .select("id")
    .eq("id", shareholderId)
    .eq("list_id", listId)
    .maybeSingle()
  if (error || !row) {
    return { ok: false, message: "주주를 찾을 수 없습니다." }
  }

  return { ok: true }
}
