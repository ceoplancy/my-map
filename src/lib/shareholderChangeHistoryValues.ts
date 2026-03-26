/**
 * shareholder_change_history.old_value / new_value 저장·전송 시 상한.
 * memo·history(json) 등이 매우 클 때 Vercel 요청 본문 한도·PostgREST/DB 층에서 실패하는 것을 완화한다.
 */
export const MAX_CHANGE_HISTORY_VALUE_CHARS = 200_000

export function truncateChangeHistoryValue(value: string): string {
  if (value.length <= MAX_CHANGE_HISTORY_VALUE_CHARS) {
    return value
  }

  return `${value.slice(0, MAX_CHANGE_HISTORY_VALUE_CHARS)}\n… [truncated]`
}

/** 변경 이력 `changed_at`(ISO) 표시용 — 주주 수정 모달·기타 UI 공통 */
export function formatChangeHistoryTimestamp(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(t))
}
