/**
 * TanStack Query 키 — 문자열 하드코딩 분산 방지
 * (레거시 단일 테이블 지도 데이터는 dev에서 제거됨)
 */
export const QUERY_KEYS = {
  filterMenu: ["filterMenu"] as const,
} as const
