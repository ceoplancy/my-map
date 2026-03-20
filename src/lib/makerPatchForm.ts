import type { MapMarkerData } from "@/types/map"

/** 저장 로직과 동일하게 상태·메모를 비교하기 위한 정규화 */
export function normalizeStatusForPatch(
  raw: string | null | undefined,
): string {
  const s = (raw ?? "").trim()

  return s !== "" ? s : "미방문"
}

export function normalizeMemoForPatch(raw: string | null | undefined): string {
  return (raw ?? "").trim()
}

export function hasPatchChanges(
  row: MapMarkerData,
  values: { status: string; memo: string },
): boolean {
  return (
    normalizeStatusForPatch(values.status) !==
      normalizeStatusForPatch(row.status) ||
    normalizeMemoForPatch(values.memo) !== normalizeMemoForPatch(row.memo)
  )
}
