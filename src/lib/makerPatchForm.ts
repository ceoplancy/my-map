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
  values: {
    status: string
    memo: string
    phone?: string | null
    image?: string | null
    proxy_document_image?: string | null
  },
): boolean {
  const statusChanged =
    normalizeStatusForPatch(values.status) !==
    normalizeStatusForPatch(row.status)
  const memoChanged =
    normalizeMemoForPatch(values.memo) !== normalizeMemoForPatch(row.memo)
  const phoneChanged = (values.phone ?? "").trim() !== (row.phone ?? "").trim()
  const imageChanged = (values.image ?? "").trim() !== (row.image ?? "").trim()
  const proxyChanged =
    (values.proxy_document_image ?? "").trim() !==
    (row.proxy_document_image ?? "").trim()

  return (
    statusChanged || memoChanged || phoneChanged || imageChanged || proxyChanged
  )
}
