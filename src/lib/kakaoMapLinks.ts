/**
 * 카카오맵 웹/앱 연동 URL (모바일에서 앱 설치 시 앱으로 열리는 경우가 많음).
 * @see https://apis.map.kakao.com/web/guide/ — 링크 API
 */

export type KakaoMapLinkInput = {
  name?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
}

function safePlaceLabel(
  name: string | null | undefined,
  address?: string | null,
): string {
  const addressFirst = (address ?? "").replace(/,/g, " ").trim()
  if (addressFirst) return addressFirst

  const t = (name ?? "목적지").replace(/,/g, " ").trim()

  return t || "목적지"
}

/**
 * 위·경도가 있으면 길찾기(to), 없고 주소만 있으면 검색(search).
 * 둘 다 없으면 null.
 */
export function getKakaoMapLinkUrl(input: KakaoMapLinkInput): string | null {
  const lat = input.lat
  const lng = input.lng
  const address = (input.address ?? "").trim()

  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    const label = safePlaceLabel(input.name, input.address)

    return `https://map.kakao.com/link/to/${encodeURIComponent(label)},${lat},${lng}`
  }

  if (address) {
    return `https://map.kakao.com/link/search/${encodeURIComponent(address)}`
  }

  return null
}
