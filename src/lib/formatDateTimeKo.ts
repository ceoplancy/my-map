/** ISO 날짜 문자열을 한국어 로캘로 표시 (목록·변경 이력 등 공통) */
export function formatDateTimeKo(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) {
    return iso
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(t))
}
