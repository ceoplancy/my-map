/* eslint-disable lines-around-comment -- JSDoc on type fields; blank line before comment is removed by Prettier */
import * as Sentry from "@sentry/nextjs"
import { toast } from "react-toastify"

import { isNetworkNoiseError } from "@/lib/sentryNoise"

export type ReportErrorOptions = {
  /** 사용자에게 보여줄 토스트 메시지 (없으면 토스트 안 함) */
  toastMessage?: string

  /** Sentry 컨텍스트 */
  context?: Record<string, unknown>
}

/**
 * 클라이언트에서 에러 로깅 + 선택적 토스트.
 * Sentry.captureException + (선택) toast.error 한 번에 처리.
 */
export function reportError(
  error: unknown,
  options: ReportErrorOptions = {},
): void {
  const err = error instanceof Error ? error : new Error(String(error))
  if (isNetworkNoiseError(err)) {
    if (options.toastMessage) {
      toast.error(options.toastMessage)
    }

    return
  }
  if (options.context) {
    Sentry.setContext("error-context", options.context)
  }
  Sentry.captureException(err)
  if (options.toastMessage) {
    toast.error(options.toastMessage)
  }
}

/**
 * 메시지만 Sentry에 기록 (에러 객체 없을 때).
 */
export function reportMessage(
  message: string,
  level: Sentry.SeverityLevel = "error",
  toastMessage?: string,
): void {
  Sentry.captureMessage(message, level)
  if (toastMessage) {
    toast.error(toastMessage)
  }
}
