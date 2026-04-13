import { nanoid } from "nanoid"

import { Excel } from "@/types/excel"

export type ImportFailReason = "geocode" | "empty_address" | "db"

export interface DeferredFailure {
  id: string
  excel: Excel
  reason: ImportFailReason
  addedAt: string
  sourceFile?: string | null
}

const STORAGE_KEY = "my-map:excel-import-deferred:v1"

export const PRESERVE_QUEUE_PREF_KEY = "my-map:excel-import:preserve-queue"

export function excelDedupKey(e: Excel): string {
  return [
    String(e.company ?? "").trim(),
    String(e.name ?? "").trim(),
    String(e.address ?? "").trim(),
    String(e.stocks ?? ""),
  ].join("\u001f")
}

export function createDeferredFailure(
  excel: Excel,
  reason: ImportFailReason,
  sourceFile: string | null,
): DeferredFailure {
  return {
    id: nanoid(),
    excel,
    reason,
    addedAt: new Date().toISOString(),
    sourceFile,
  }
}

export function mergeDeferredLists(
  existing: DeferredFailure[],
  incoming: DeferredFailure[],
  mode: "append" | "replace",
): DeferredFailure[] {
  if (mode === "replace") {
    return dedupeByExcelKey(incoming)
  }

  const map = new Map<string, DeferredFailure>()
  for (const x of existing) {
    map.set(excelDedupKey(x.excel), x)
  }
  for (const y of incoming) {
    map.set(excelDedupKey(y.excel), y)
  }

  return Array.from(map.values())
}

function dedupeByExcelKey(items: DeferredFailure[]): DeferredFailure[] {
  const map = new Map<string, DeferredFailure>()
  for (const y of items) {
    map.set(excelDedupKey(y.excel), y)
  }

  return Array.from(map.values())
}

export function loadDeferredFailures(): DeferredFailure[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as DeferredFailure[]
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (x) =>
        x &&
        typeof x.id === "string" &&
        x.excel &&
        typeof x.reason === "string",
    )
  } catch {
    return []
  }
}

export function saveDeferredFailures(items: DeferredFailure[]): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // storage full or private mode
  }
}

export function loadPreserveQueuePref(): boolean | null {
  if (typeof window === "undefined") return null

  const v = localStorage.getItem(PRESERVE_QUEUE_PREF_KEY)
  if (v === null) return null

  return v === "true"
}

export function savePreserveQueuePref(value: boolean): void {
  if (typeof window === "undefined") return

  localStorage.setItem(PRESERVE_QUEUE_PREF_KEY, String(value))
}

export interface GeocodeRowResult {
  success: boolean
  data?: Excel
  failReason?: ImportFailReason
}

/**
 * 카카오 지오코딩만 수행합니다. React state 부작용 없음.
 */
export function geocodeExcelRow(
  geocoder: any,
  excel: Excel,
): Promise<GeocodeRowResult> {
  return new Promise((resolve) => {
    const addr = String(excel.address ?? "").trim()
    if (!addr) {
      resolve({ success: false, failReason: "empty_address" })

      return
    }

    geocoder.addressSearch(
      addr,
      (result: { y: number; x: number }[], status: string) => {
        if (
          status === window.kakao.maps.services.Status.OK &&
          result?.length > 0
        ) {
          resolve({
            success: true,
            data: {
              ...excel,
              lat: Number(result[0].y),
              lng: Number(result[0].x),
              stocks: Number(excel.stocks) || 0,
            },
          })
        } else {
          resolve({ success: false, failReason: "geocode" })
        }
      },
    )
  })
}

export function coerceSheetRowToExcel(raw: Record<string, unknown>): Excel {
  const stocks = Number(raw.stocks)
  const id = raw.id != null ? Number(raw.id) : 0

  return {
    ...(raw as unknown as Excel),
    id: Number.isFinite(id) ? id : 0,
    stocks: Number.isFinite(stocks) ? stocks : 0,
  }
}
