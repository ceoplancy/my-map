import type { HistoryChange, HistoryItem } from "@/types/excelHistory"
import type { Json } from "@/types/db"

/** 저장 시 상태 필드 정규화 (빈 값 → 미방문) */
export function normalizeStatusForHistory(
  raw: string | null | undefined,
): string {
  const s = (raw ?? "").trim()

  return s !== "" ? s : "미방문"
}

export function normalizeMemoForHistory(
  raw: string | null | undefined,
): string {
  return (raw ?? "").trim()
}

/**
 * DB/레거시에서 온 history를 안전히 HistoryItem[]로 변환
 * (null, 잘못된 형식, 문자열 로그 항목은 제외)
 */
export function normalizeExcelHistoryJson(raw: unknown): HistoryItem[] {
  if (raw == null) {
    return []
  }

  if (!Array.isArray(raw)) {
    return []
  }

  const out: HistoryItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const h = item as Record<string, unknown>
    if (
      typeof h.modifier !== "string" ||
      typeof h.modified_at !== "string" ||
      h.changes === null ||
      typeof h.changes !== "object"
    ) {
      continue
    }
    out.push(item as HistoryItem)
  }

  return out
}

/**
 * 상태·메모 변경분을 UI(변경이력)에서 쓰는 HistoryChange 형태로 생성
 */
export function buildHistoryChanges(
  row: { status: string | null | undefined; memo: string | null | undefined },
  next: { status: string; memo: string },
): HistoryChange {
  const changes: HistoryChange = {}
  const oStatus = normalizeStatusForHistory(row.status)
  const nStatus = normalizeStatusForHistory(next.status)
  if (oStatus !== nStatus) {
    changes.status = { original: oStatus, modified: nStatus }
  }
  const oMemo = normalizeMemoForHistory(row.memo)
  const nMemo = normalizeMemoForHistory(next.memo)
  if (oMemo !== nMemo) {
    changes.memo = {
      original: oMemo.length > 0 ? oMemo : "(없음)",
      modified: nMemo.length > 0 ? nMemo : "(없음)",
    }
  }

  return changes
}

export function mergeHistoryWithNewEntry(
  rawExisting: Json | null | undefined,
  entry: HistoryItem,
): Json {
  const prev = normalizeExcelHistoryJson(rawExisting)

  return [...prev, entry] as unknown as Json
}
