/** @deprecated 전역 키 — 워크스페이스별로는 getMapStorageKeys 사용 */
export const STORAGE_KEY = {
  position: "map_last_position",
  level: "map_last_level",
} as const

/** 워크스페이스마다 지도 뷰 상태를 분리해, 다른 WS에서 본 위치가 빈 지도를 만들지 않게 함 */
export function getMapStorageKeys(workspaceId: string): {
  position: string
  level: string
} {
  return {
    position: `map_last_position_${workspaceId}`,
    level: `map_last_level_${workspaceId}`,
  }
}
