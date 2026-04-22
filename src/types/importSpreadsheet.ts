import type { Json } from "./db"

/**
 * 스프레드시트 업로드·실패 행 편집용 행 형태 (XLSX 파싱·지오코딩 단계).
 * 적재 시에는 shareholders 행으로 변환합니다.
 */
export type ImportSpreadsheetRow = {
  id: number
  shareholderId?: string | null

  /** 업로드 원문 주소 — 지오코딩 후에도 동일인 매칭·표시에 사용 */
  addressOriginal: string | null
  address: string | null
  company: string | null
  history: Json | null
  image: string | null
  lat: number | null
  latlngaddress: string | null
  lng: number | null
  maker: string | null
  phone: string | null
  memo: string | null
  name: string | null
  status: string | null
  stocks: number
}
