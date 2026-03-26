/**
 * PostgREST `.single()` / 클라이언트 coercion 대신 `.maybeSingle()` 사용 후
 * 0행이면 명시적으로 예외를 던질 때 사용한다.
 */
export function requireSupabaseRow<T>(data: T | null, message: string): T {
  if (data === null) {
    throw new Error(message)
  }

  return data
}
