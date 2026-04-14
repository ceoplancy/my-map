import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import {
  hasValidKakaoCoords,
  kakaoMapDirectionsToUrl,
  kakaoMapViewUrl,
} from "@/lib/kakaoMapLinks"

type Props = {
  lat: unknown
  lng: unknown
  name?: string | null
  address?: string | null
}

/**
 * 카카오맵 공식 링크 — PC/모바일 웹·앱으로 이어짐
 * @see https://apis.map.kakao.com/web/guide/#url
 */
export function ShareholderExternalMapLinks({
  lat,
  lng,
  name,
  address,
}: Props) {
  if (!hasValidKakaoCoords(lat, lng)) {
    return (
      <Muted>
        위·경도가 있으면 카카오맵(지도 보기·길찾기)으로 연결할 수 있습니다.
      </Muted>
    )
  }

  const la = Number(lat)
  const ln = Number(lng)
  const label =
    `${name ?? ""}`.trim() || `${address ?? ""}`.trim().slice(0, 80) || "목적지"

  return (
    <Row>
      <MapLink
        href={kakaoMapViewUrl(la, ln)}
        target="_blank"
        rel="noopener noreferrer">
        지도에서 보기
      </MapLink>
      <MapLink
        href={kakaoMapDirectionsToUrl(la, ln, label)}
        target="_blank"
        rel="noopener noreferrer">
        길찾기(목적지)
      </MapLink>
    </Row>
  )
}

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`

const MapLink = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: ${COLORS.blue[600]};
  background: ${COLORS.blue[50]};
  border: 1px solid ${COLORS.blue[200]};
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s ease;

  &:hover {
    background: ${COLORS.blue[100]};
  }
`

const Muted = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${COLORS.gray[500]};
  line-height: 1.5;
`
