import { StockRange } from "@/store/filterState"
import { UserMetadata } from "@supabase/supabase-js"

export type FilterParams = {
  status: string[]
  company: string[]
  stocks: StockRange[]

  /** 회사(주주명부) 필터가 정확히 1개일 때만 적용: 주식수 하한 */
  rosterStockMin?: number | null

  /** 회사(주주명부) 필터가 정확히 1개일 때만 적용: 주식수 상한 */
  rosterStockMax?: number | null
  lat?: number
  lng?: number
  bounds?: {
    sw: { lat: number; lng: number }
    ne: { lat: number; lng: number }
  }
  city?: string
  userMetadata?: UserMetadata
}

export type CoordinateRanges = {
  [key: number]: number
}
