import type { Tables } from "./db"
import type { Excel } from "./excel"

export type Shareholder = Tables<"shareholders">

/** 지도 마커 데이터: Excel(레거시) 또는 Shareholder(워크스페이스 주주명부) */
export type MapMarkerData = Excel | Shareholder

export function isShareholderMarker(m: MapMarkerData): m is Shareholder {
  return (
    "list_id" in m && typeof (m as { list_id?: string }).list_id === "string"
  )
}
