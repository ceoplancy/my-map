/**
 * API JSON `{ error: ... }` 이 객체일 때 `Error: [object Object]` 가 되지 않도록 문자열로 만듦.
 */
export function apiErrorMessageFromBody(
  body: { error?: unknown },
  fallback: string,
): string {
  const e = body.error
  if (typeof e === "string") {
    return e
  }
  if (e != null && typeof e === "object") {
    return JSON.stringify(e)
  }

  return fallback
}
