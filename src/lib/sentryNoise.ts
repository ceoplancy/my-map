/** 네트워크 일시 실패 — Sentry에는 안 올리고 토스트만 유지할 때 */
export function isNetworkNoiseError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  if (error.name === "AuthRetryableFetchError") {
    return true
  }
  const m = error.message

  return m.includes("Failed to fetch") || m.includes("Load failed")
}

const DROPPED_EXCEPTION_MESSAGE_SUBSTRINGS = [
  "Auth session missing",
  "Invalid login credentials",
  "Load failed",
  "Failed to fetch",
  "AuthRetryableFetchError",
  "Lock was stolen by another request",
  "Lock broken by another request",
  "vendor-chunks/next.js",
  "ReactCurrentDispatcher",
  "zoomSeq is not defined",
  "mapLevel is not defined",
  // 세션·Bearer 누락·만료 401 등 — 이벤트 문자열이 `Error: Unauthorized` 형태일 때도 걸러짐
  "Unauthorized",
] as const

export function matchesDroppedSentryExceptionText(value: string): boolean {
  return DROPPED_EXCEPTION_MESSAGE_SUBSTRINGS.some((p) => value.includes(p))
}

export function shouldDropOriginalExceptionForSentry(error: Error): boolean {
  if (error.name === "AuthSessionMissingError") {
    return true
  }

  if (
    error.name === "AuthApiError" &&
    (error.message.includes("Invalid login credentials") ||
      error.message.includes("invalid_credentials"))
  ) {
    return true
  }

  if (error.message.includes("Unauthorized")) {
    return true
  }

  if (error.name === "AuthRetryableFetchError") {
    return true
  }

  if (error.name === "AbortError") {
    return true
  }

  return false
}
