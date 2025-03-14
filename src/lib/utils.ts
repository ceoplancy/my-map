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

export const removeTags = (str: string | null) => {
  if (!str) return ""

  return str.replace(/<\/?[^>]+(>|$)/g, "")
}

export const normalizePathname = (path: string) => {
  // 경로가 '/'로 끝나고 루트 경로('/')가 아닌 경우, 마지막 '/'를 제거
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path
}
