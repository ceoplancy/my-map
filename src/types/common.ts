export type FilterParams = {
  status: string[]
  company: string[]
  startStocks: number
  endStocks: number
  lat?: number
  lng?: number
  bounds?: {
    sw: { lat: number; lng: number }
    ne: { lat: number; lng: number }
  }
}

export type CoordinateRanges = {
  [key: number]: number
}
