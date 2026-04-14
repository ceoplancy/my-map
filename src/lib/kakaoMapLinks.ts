/**
 * 카카오 지도 Web 가이드 — 지도 URL
 * @see https://apis.map.kakao.com/web/guide/#url
 */

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n)) return null

  return n
}

/** 위·경도가 숫자로 유효할 때 (0,0 제외) */
export function hasValidKakaoCoords(lat: unknown, lng: unknown): boolean {
  const la = num(lat)
  const ln = num(lng)
  if (la == null || ln == null) return false
  if (Math.abs(la) < 1e-6 && Math.abs(ln) < 1e-6) return false

  return true
}

/** 해당 좌표가 중심인 지도 보기 */
export function kakaoMapViewUrl(lat: number, lng: number): string {
  return `https://map.kakao.com/link/map/${lat},${lng}`
}

/**
 * 길찾기 화면 — 목적지만 지정 (출발지는 사용자가 앱/웹에서 입력)
 * 형식: /link/to/이름,위도,경도
 */
export function kakaoMapDirectionsToUrl(
  lat: number,
  lng: number,
  placeLabel: string,
): string {
  const name = placeLabel.trim() || "목적지"

  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`
}
