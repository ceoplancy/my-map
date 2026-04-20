import type { PostgrestError } from "@supabase/supabase-js"

/**
 * PostgREST/Supabase REST가 `select` 등에 없는 컬럼을 넣었을 때 흔히 내는 오류.
 * 운영 DB가 타입/마이그레이션보다 뒤처진 경우 폴백 쿼리에 사용한다.
 */
export function isPostgrestUndefinedColumnError(
  error: PostgrestError | { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  const code = String(error.code ?? "")
  if (code === "42703") return true
  const m = String(error.message ?? "").toLowerCase()
  if (m.includes("column") && m.includes("does not exist")) return true

  return false
}
