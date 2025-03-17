import { StockRange } from "@/store/filterState"
import { UserMetadata } from "@supabase/supabase-js"

export type FilterParams = {
  status: string[]
  company: string[]
  stocks: StockRange[]
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
