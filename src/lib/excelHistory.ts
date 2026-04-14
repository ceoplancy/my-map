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
 * 단일 항목이 HistoryItem 규칙을 만족하는지 (merge·normalize 공통 기준)
 */
function parseHistoryItem(item: unknown): HistoryItem | null {
  if (!item || typeof item !== "object") return null
  const h = item as Record<string, unknown>
  if (
    typeof h.modifier !== "string" ||
    typeof h.modified_at !== "string" ||
    h.changes === null ||
    typeof h.changes !== "object"
  ) {
    return null
  }

  return item as HistoryItem
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
    const parsed = parseHistoryItem(item)
    if (parsed) out.push(parsed)
  }

  return out
}

/** merge 시 normalize에 의해 버려지는 배열 항목 수를 센다 */
function countHistoryEntriesDroppedOnMerge(raw: unknown): number {
  if (raw == null || !Array.isArray(raw)) return 0

  let dropped = 0
  for (const item of raw) {
    if (!parseHistoryItem(item)) dropped++
  }

  return dropped
}

/**
 * merge 직전 손실 가능성 요약
 * - droppedEntryCount: 배열 항목 중 표준 HistoryItem 형식이 아니어 버려지는 개수
 * - losesNonArrayShape: history가 배열이 아닌 JSON이면 merge 시 기존 전체가 대체될 수 있음
 */
export type HistoryMergeLossInfo = {
  droppedEntryCount: number
  losesNonArrayShape: boolean
}

/**
 * mergeHistoryWithNewEntry 직전에, 레거시 손실 여부를 사용자에게 알리기 위한 정보
 */
export function getHistoryMergeLossInfo(raw: unknown): HistoryMergeLossInfo {
  if (raw == null) {
    return { droppedEntryCount: 0, losesNonArrayShape: false }
  }
  if (!Array.isArray(raw)) {
    return { droppedEntryCount: 0, losesNonArrayShape: true }
  }

  return {
    droppedEntryCount: countHistoryEntriesDroppedOnMerge(raw),
    losesNonArrayShape: false,
  }
}

/**
 * 상태·메모·연락처·특이사항 변경분을 UI(변경이력)에서 쓰는 HistoryChange 형태로 생성
 */
export function buildHistoryChanges(
  row: {
    status: string | null | undefined
    memo: string | null | undefined
    phone?: string | null | undefined
    special_notes?: string | null | undefined
    image?: string | null | undefined
  },
  next: {
    status: string
    memo: string
    phone: string
    special_notes: string
    image: string
  },
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

  const oPhone = normalizeMemoForHistory(row.phone)
  const nPhone = normalizeMemoForHistory(next.phone)
  if (oPhone !== nPhone) {
    changes.phone = {
      original: oPhone.length > 0 ? oPhone : "(없음)",
      modified: nPhone.length > 0 ? nPhone : "(없음)",
    }
  }

  const oNotes = normalizeMemoForHistory(row.special_notes)
  const nNotes = normalizeMemoForHistory(next.special_notes)
  if (oNotes !== nNotes) {
    changes.special_notes = {
      original: oNotes.length > 0 ? oNotes : "(없음)",
      modified: nNotes.length > 0 ? nNotes : "(없음)",
    }
  }

  const oImage = normalizeMemoForHistory(row.image)
  const nImage = normalizeMemoForHistory(next.image)
  if (oImage !== nImage) {
    changes.image = {
      original: oImage.length > 0 ? oImage : "(없음)",
      modified: nImage.length > 0 ? nImage : "(없음)",
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
