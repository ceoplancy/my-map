/**
 * `String(plainObject)` → `Error: [object Object]` 방지.
 * React Query·Supabase 등에서 던지는 비표준 객체를 메시지로 풀어냄.
 */
export function unknownToError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === "string") return new Error(error)
  if (error != null && typeof error === "object") {
    const o = error as Record<string, unknown>
    const msg =
      typeof o.message === "string"
        ? o.message
        : typeof o.error === "string"
          ? o.error
          : typeof o.description === "string"
            ? o.description
            : typeof o.msg === "string"
              ? o.msg
              : null
    if (msg) return new Error(msg)
    try {
      return new Error(JSON.stringify(error))
    } catch {
      return new Error("[non-serializable error object]")
    }
  }

  return new Error(String(error))
}
