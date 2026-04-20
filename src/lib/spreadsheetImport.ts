import type { ImportSpreadsheetRow } from "@/types/importSpreadsheet"

/** 내보내기·재업로드 매칭용 주주 UUID (PostgreSQL uuid 텍스트) */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function cellToTrimmedString(v: unknown): string | null {
  if (v === undefined || v === null) return null
  if (typeof v === "string") return v.trim() || null
  if (typeof v === "number" && Number.isFinite(v)) return String(v)
  if (typeof v === "boolean") return v ? "true" : "false"

  return null
}

function pickString(
  raw: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const t = cellToTrimmedString(raw[k])
    if (t !== null && t !== "") return t
  }

  return null
}

export function normalizeAddressForDedupe(
  s: string | null | undefined,
): string {
  if (!s) return ""
  const t = s.normalize("NFKC").replace(/\s+/g, "").toLowerCase()

  return t
}

export function dedupeKeyFromRow(
  stocks: number,
  originalAddress: string | null | undefined,
): string {
  return `${Number(stocks) || 0}:${normalizeAddressForDedupe(originalAddress)}`
}

function pickNumber(raw: Record<string, unknown>, keys: string[]): number {
  const s = pickString(raw, keys)
  if (!s) return 0
  const n = parseInt(s.replace(/,/g, ""), 10)

  return Number.isFinite(n) ? n : 0
}

/**
 * XLSX 첫 행 헤더(한글/영문)를 주주 행으로 정규화.
 * `주주ID` 열이 있으면 재업로드 시 해당 행만 UPDATE(변경 이력 API 미호출).
 */
export function parseSpreadsheetRow(
  raw: Record<string, unknown>,
  rowIndex: number,
): ImportSpreadsheetRow {
  const sid = pickString(raw, ["주주ID", "shareholder_id", "shareholderId"])
  const shareholderId = sid && UUID_RE.test(sid) ? sid : null
  const addressOriginal = pickString(raw, ["주소", "address"])

  return {
    id: rowIndex + 1,
    shareholderId,
    addressOriginal,
    name: pickString(raw, ["이름", "name", "주주명"]),
    company: pickString(raw, ["회사명", "company", "회사", "상장사명"]),
    address: addressOriginal,
    status: pickString(raw, ["상태", "status", "방문 상태"]),
    memo: pickString(raw, ["메모", "memo"]),
    maker: pickString(raw, ["담당", "maker", "마커"]),
    stocks: pickNumber(raw, ["주식수", "stocks"]),
    lat: null,
    lng: null,
    latlngaddress: null,
    image: null,
    history: null,
  }
}
