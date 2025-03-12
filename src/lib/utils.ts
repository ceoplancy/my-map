import { CoordinateRanges } from "@/types/common"

export const getCoordinateRanges = (mapLevel: number) => {
  const ranges: CoordinateRanges = {
    1: 0.003,
    2: 0.006,
    3: 0.02,
    4: 0.03,
    5: 0.05,
    6: 0.09,
    7: 0.16,
    8: 0.6,
    9: 0.75,
    10: 1,
    11: 1.8,
    12: 4,
    13: 100,
    14: 100,
  }

  const range = ranges[mapLevel] || 100

  return { latRange: range, lngRange: range }
}
