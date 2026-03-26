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
