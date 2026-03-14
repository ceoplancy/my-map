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
    10: 1.4,
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

import { INTEGRATED_PATH_PREFIXES } from "@/lib/admin-routes"

export const isIntegratedRoute = (pathname: string) => {
  const normalized = normalizePathname(pathname)

  return INTEGRATED_PATH_PREFIXES.some(
    (p) => normalized === p || normalized.startsWith(p + "/"),
  )
}

/** 워크스페이스별 관리자 대시보드: /workspaces/[workspaceId]/admin (trailing segment 없음) */
export const isWorkspaceAdminDashboardRoute = (pathname: string) => {
  const normalized = normalizePathname(pathname)
  const parts = normalized.split("/")

  return (
    parts.length === 4 &&
    parts[1] === "workspaces" &&
    parts[2]?.length > 0 &&
    parts[3] === "admin"
  )
}

/** 워크스페이스별 관리자 하위 경로인지 (lists, shareholders, excel-import, members, change-history) */
export const isWorkspaceAdminRoute = (pathname: string) => {
  const normalized = normalizePathname(pathname)
  const parts = normalized.split("/")

  return (
    parts.length >= 5 &&
    parts[1] === "workspaces" &&
    parts[2]?.length > 0 &&
    parts[3] === "admin"
  )
}

/** pathname에서 workspaceId 추출 (e.g. /workspaces/xxx/admin → xxx) */
export const getWorkspaceIdFromPath = (pathname: string): string | null => {
  const parts = normalizePathname(pathname).split("/")
  if (
    parts.length >= 4 &&
    parts[1] === "workspaces" &&
    parts[2] &&
    parts[3] === "admin"
  )
    return parts[2]

  return null
}

export { getWorkspaceAdminBase } from "@/lib/admin-routes"
