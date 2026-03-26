/**
 * 세션 만료·권한 부족(401/403)은 Sentry에 남기지 않음. 서버 오류·기타 클라이언트 오류는 계속 보고.
 */
export function shouldReportSentryForHttpStatus(status: number): boolean {
  if (status === 401 || status === 403) {
    return false
  }

  return true
}
