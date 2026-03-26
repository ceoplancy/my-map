import type { ErrorEvent, EventHint } from "@sentry/nextjs"

import {
  matchesDroppedSentryExceptionText,
  shouldDropOriginalExceptionForSentry,
} from "@/lib/sentryNoise"

/**
 * Sentry에 보내면 안 되는 “예상 가능한” 클라이언트 오류(인증·세션·일시 네트워크)를 걸러냅니다.
 * 실제 버그 추적은 유지하면서 노이즈 이슈를 줄입니다.
 */
export function sentryBeforeSend(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  const original = hint.originalException

  if (
    original instanceof Error &&
    shouldDropOriginalExceptionForSentry(original)
  ) {
    return null
  }

  const first = event.exception?.values?.[0]?.value ?? event.message ?? ""

  if (typeof first === "string" && matchesDroppedSentryExceptionText(first)) {
    return null
  }

  return event
}
