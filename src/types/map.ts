import type { Tables } from "./db"

export type Shareholder = Tables<"shareholders">

/** 지도 마커: 워크스페이스 주주명부(shareholders) 행 */
export type MapMarkerData = Shareholder

export function isShareholderMarker(m: MapMarkerData): m is Shareholder {
  return (
    "list_id" in m && typeof (m as { list_id?: string }).list_id === "string"
  )
}
