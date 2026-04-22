/**
 * 한국식 전화번호: 입력·표시는 하이픈, DB·API에는 숫자만 저장하는 편이
 * 검색·엑셀·복사에 유리합니다.
 */

const MAX_LOCAL_DIGITS = 11

/** 숫자만 추출 (최대 11자리 국내 번호 기준) */
export function phoneDigitsOnly(input: string): string {
  let d = input.replace(/\D/g, "")
  if (d.startsWith("82") && d.length > 2) {
    d = `0${d.slice(2)}`
  }

  return d.slice(0, MAX_LOCAL_DIGITS)
}

/** 저장용: 숫자만, 비어 있으면 null */
export function normalizePhoneForDb(
  input: string | null | undefined,
): string | null {
  const d = phoneDigitsOnly(input ?? "")

  return d.length > 0 ? d : null
}

/**
 * 표시·입력 필드용 포맷 (서울 02·휴대폰 01x 등 흔한 케이스).
 * `value`는 숫자만이어도 되고, 기존에 하이픈이 있어도 됩니다.
 */
export function formatKoreanPhoneInput(raw: string | null | undefined): string {
  const d = phoneDigitsOnly(raw ?? "")
  if (!d) return ""

  if (d.startsWith("02")) {
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`

    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`
  }

  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`

  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}
