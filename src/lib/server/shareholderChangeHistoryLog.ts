import type { NextApiRequest } from "next"

/**
 * Vercel / Node 런타임 로그에서 `shareholder_change_history` 로 검색하면 됨.
 * 한 줄 JSON으로 출력해 필터·grep에 쓰기 쉽게 함.
 *
 * scope: 고정 태그. phase: 요청 단계(원인 분류).
 * fields: POST 시 변경 필드명. entriesPreview: 필드별 이전/새 값(로그용, 길면 잘림).
 * dbError: Supabase insert 오류.
 */
export type ChangeEntryPreview = {
  field: string
  old_value: string | null
  new_value: string | null
}

/** 한 값당 최대 길이 — Vercel 로그 한 줄 폭 과다 방지 */
const LOG_VALUE_MAX_CHARS = 4000

export function truncateForLogValue(value: string | null): string | null {
  if (value == null) {
    return null
  }
  if (value.length <= LOG_VALUE_MAX_CHARS) {
    return value
  }

  return `${value.slice(0, LOG_VALUE_MAX_CHARS)}…(+${value.length - LOG_VALUE_MAX_CHARS} chars)`
}

export function entriesPreviewForLog(
  entries: Array<{
    field: string
    old_value: string | null
    new_value: string | null
  }>,
): ChangeEntryPreview[] {
  return entries.map((e) => ({
    field: String(e.field),
    old_value: truncateForLogValue(e.old_value ?? null),
    new_value: truncateForLogValue(e.new_value ?? null),
  }))
}

export type ShareholderChangeHistoryLogPayload = {
  scope: "shareholder_change_history"
  phase:
    | "post_start"
    | "post_insert_ok"
    | "post_insert_error"
    | "post_skip_empty"
    | "get_ok"
    | "get_error"
    | "auth_no_bearer"
    | "auth_invalid_token"
    | "auth_invalid_bearer_and_cookie"
    | "auth_no_bearer_or_cookie_session"
    | "scope_denied"
    | "bad_request"
    | "method_not_allowed"
  shareholderId: string
  method: string
  userId?: string | null
  workspaceId?: string | null
  fields?: string[]

  /** POST 본문 entries의 값 요약(필드명 + old/new). */
  entriesPreview?: ChangeEntryPreview[]
  entryCount?: number

  /** GET `?forMap=1` 지도용 경량 조회 여부 */
  forMap?: boolean
  dbError?: { code?: string; message: string; details?: string }
  requestId?: string | null
  httpStatus?: number
}

function requestIdFromHeaders(req: NextApiRequest): string | null {
  const h = req.headers
  const v =
    (typeof h["x-vercel-id"] === "string" && h["x-vercel-id"]) ||
    (typeof h["x-request-id"] === "string" && h["x-request-id"]) ||
    (typeof h["cf-ray"] === "string" && h["cf-ray"])

  return v || null
}

export function logShareholderChangeHistory(
  req: NextApiRequest,
  payload: Omit<ShareholderChangeHistoryLogPayload, "requestId"> & {
    requestId?: string | null
  },
): void {
  const line: ShareholderChangeHistoryLogPayload = {
    ...payload,
    requestId: payload.requestId ?? requestIdFromHeaders(req),
  }
  const msg = JSON.stringify(line)
  if (
    payload.phase === "post_insert_error" ||
    payload.phase === "get_error" ||
    payload.phase === "auth_no_bearer" ||
    payload.phase === "auth_invalid_token" ||
    payload.phase === "auth_invalid_bearer_and_cookie" ||
    payload.phase === "auth_no_bearer_or_cookie_session" ||
    payload.phase === "scope_denied"
  ) {
    console.error(`[shareholder_change_history] ${msg}`)
  } else {
    console.info(`[shareholder_change_history] ${msg}`)
  }
}
