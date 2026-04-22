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
  if (code === "PGRST204") return true
  const m = String(error.message ?? "").toLowerCase()
  if (m.includes("column") && m.includes("does not exist")) return true
  if (m.includes("column") && m.includes("not found")) return true
  if (m.includes("could not find") && m.includes("column")) return true

  return false
}

/**
 * 테이블이 스키마에 없거나 REST에 노출되지 않은 경우(브라우저 네트워크 404 등).
 * 규율 동의 등 부가 기능을 끄고 앱 본동선은 유지할 때 사용.
 */
export function isPostgrestRelationNotFoundError(
  error: PostgrestError | { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  const code = String(error.code ?? "")
  if (code === "PGRST205") return true
  if (code === "42P01") return true
  const m = String(error.message ?? "").toLowerCase()
  if (m.includes("could not find the table")) return true
  if (m.includes("relation") && m.includes("does not exist")) return true
  if (m.includes("schema cache") && m.includes("table")) return true

  return false
}
