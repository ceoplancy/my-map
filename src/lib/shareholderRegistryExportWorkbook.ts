import * as XLSX from "xlsx"

import type { ChangeEntry } from "@/api/workspace"
import {
  getPrimaryStatusCategory,
  PRIMARY_STATUS_OPTIONS,
} from "@/lib/shareholderStatus"
import type { Tables } from "@/types/db"

type ShareholderRow = Tables<"shareholders">

/** 엑셀 내보내기 대화상자 옵션 — 요약 시트·변경이력·시트 분리·추가 열 */
export type ShareholderRegistryExportOptions = {
  includeSummarySheet: boolean
  changeHistoryMode: "none" | "inline" | "separate_sheet"
  splitSheetsByPrimaryStatus: boolean
  includeMaker: boolean
  includeCoordinates: boolean
  includeGeocodeStatus: boolean
  includeResolvedAddress: boolean
}

export const DEFAULT_SHAREHOLDER_REGISTRY_EXPORT_OPTIONS: ShareholderRegistryExportOptions =
  {
    includeSummarySheet: true,
    changeHistoryMode: "inline",
    splitSheetsByPrimaryStatus: true,
    includeMaker: true,
    includeCoordinates: false,
    includeGeocodeStatus: true,
    includeResolvedAddress: true,
  }

function geocodeStatusLabel(gs: string | null | undefined): string {
  if (gs === "pending") return "대기"
  if (gs === "failed") return "실패"

  return "성공"
}

/** 사진 유무를 엑셀에서 한눈에 — 있음 O / 없음 X */
function photoOx(url: string | null | undefined): "O" | "X" {
  return url?.trim() ? "O" : "X"
}

function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet"
}

function sumStocks(rows: ShareholderRow[]): number {
  return rows.reduce((s, r) => s + (Number(r.stocks) || 0), 0)
}

function buildSummaryAoa(params: {
  listName: string | null | undefined
  filterDescription: string
  options: ShareholderRegistryExportOptions
  rows: ShareholderRow[]
}): any[][] {
  const { listName, filterDescription, options, rows } = params
  const now = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date())
  const totalPeople = rows.length
  const totalStocks = sumStocks(rows)

  const aoa: any[][] = [
    ["주주명부 내보내기 요약"],
    [],
    ["명부 이름", listName ?? "—"],
    ["내보낸 시각", now],
    ["필터·검색 조건", filterDescription],
    [
      "내보내 대상",
      `${totalPeople}명 · 주식수 합 ${totalStocks.toLocaleString("ko-KR")}`,
    ],
    [],
    ["포함 옵션"],
    [
      "요약 시트",
      options.includeSummarySheet ? "예" : "아니오",
      "변경이력",
      options.changeHistoryMode === "none"
        ? "미포함"
        : options.changeHistoryMode === "inline"
          ? "상세 열"
          : "별도 시트",
    ],
    [
      "1차 상태별 시트 분리",
      options.splitSheetsByPrimaryStatus ? "예" : "아니오",
      "좌표(위·경도)",
      options.includeCoordinates ? "예" : "아니오",
    ],
    [
      "주소 변환 상태(성공·대기·실패)",
      options.includeGeocodeStatus ? "예" : "아니오",
      "주소 변환 기준 주소",
      options.includeResolvedAddress ? "예" : "아니오",
    ],
    ["담당(마커)", options.includeMaker ? "예" : "아니오"],
    [],
    ["1차 상태별 집계", "", ""],
    ["구분", "인원", "주식수 합"],
  ]

  for (const cat of PRIMARY_STATUS_OPTIONS) {
    const subset = rows.filter(
      (r) => getPrimaryStatusCategory(r.status) === cat,
    )
    aoa.push([cat, subset.length, sumStocks(subset)])
  }

  const geo = { 성공: 0, 대기: 0, 실패: 0 }
  for (const r of rows) {
    const raw = r.geocode_status
    if (raw === "pending") geo.대기 += 1
    else if (raw === "failed") geo.실패 += 1
    else geo.성공 += 1
  }
  aoa.push([])
  aoa.push(["주소 변환 상태별(대상 내)", "", ""])
  aoa.push(["구분", "인원", ""])
  aoa.push(["성공", geo.성공, ""])
  aoa.push(["대기", geo.대기, ""])
  aoa.push(["실패", geo.실패, ""])

  return aoa
}

function buildDetailRecord(params: {
  item: ShareholderRow
  options: ShareholderRegistryExportOptions
  formatHistoryInline: (_shareholderId: string) => string
  getLatestModifier: (_id: string) => string
  getLatestModifiedDate: (_id2: string) => string
}): Record<string, string | number> {
  const {
    item,
    options,
    formatHistoryInline,
    getLatestModifier,
    getLatestModifiedDate,
  } = params

  const o: Record<string, string | number> = {
    주주ID: item.id,
    이름: item.name ?? "",
    회사명: item.company ?? "",
    원본주소: item.address_original ?? "",
    주소: item.address ?? "",
  }

  if (options.includeCoordinates) {
    o["위도"] = item.lat ?? ""
    o["경도"] = item.lng ?? ""
  }

  if (options.includeGeocodeStatus) {
    o["주소 변환"] = geocodeStatusLabel(item.geocode_status)
  }

  if (options.includeResolvedAddress) {
    o["주소 변환 기준"] = item.latlngaddress ?? ""
  }

  o["상태"] = item.status ?? ""
  o["주식수"] = item.stocks ?? 0
  o["휴대폰"] = item.phone ?? ""
  o["메모"] = item.memo ?? ""

  if (options.includeMaker) {
    o["담당"] = item.maker ?? ""
  }

  o["신분증 사진"] = photoOx(item.image)
  o["의결권 서류 사진"] = photoOx(item.proxy_document_image)
  o["최종수정자"] = String(getLatestModifier(item.id))
  o["최종수정일"] = String(getLatestModifiedDate(item.id))

  if (options.changeHistoryMode === "inline") {
    o["변경이력"] = formatHistoryInline(item.id)
  }

  return o
}

function detailKeysOrdered(
  options: ShareholderRegistryExportOptions,
): string[] {
  const keys: string[] = ["주주ID", "이름", "회사명", "원본주소", "주소"]
  if (options.includeCoordinates) keys.push("위도", "경도")
  if (options.includeGeocodeStatus) keys.push("주소 변환")
  if (options.includeResolvedAddress) keys.push("주소 변환 기준")
  keys.push("상태", "주식수", "휴대폰", "메모")
  if (options.includeMaker) keys.push("담당")
  keys.push("신분증 사진", "의결권 서류 사진", "최종수정자", "최종수정일")
  if (options.changeHistoryMode === "inline") keys.push("변경이력")

  return keys
}

function pickOrderedRow(
  rec: Record<string, string | number>,
  keys: string[],
): Record<string, string | number> {
  const ordered: Record<string, string | number> = {}
  for (const k of keys) {
    if (k in rec) ordered[k] = rec[k]!
  }

  return ordered
}

function buildColInfosForKeys(keys: string[]): XLSX.ColInfo[] {
  const w: Record<string, number> = {
    주주ID: 38,
    이름: 12,
    회사명: 15,
    원본주소: 28,
    주소: 40,
    위도: 12,
    경도: 12,
    "주소 변환": 10,
    "주소 변환 기준": 40,
    상태: 12,
    주식수: 8,
    휴대폰: 14,
    메모: 30,
    담당: 12,
    "신분증 사진": 8,
    "의결권 서류 사진": 12,
    최종수정자: 20,
    최종수정일: 22,
    변경이력: 60,
  }

  return keys.map((k) => ({ wch: w[k] ?? 14 }))
}

export function buildChangeHistoryFlatRows(params: {
  rows: ShareholderRow[]
  allChanges: Record<string, ChangeEntry[]>
  usersMap: Record<string, string>
  fieldLabels: Record<string, string>
}): Record<string, string>[] {
  const { rows, allChanges, usersMap, fieldLabels } = params
  const out: Record<string, string>[] = []

  for (const item of rows) {
    const entries = allChanges[item.id] ?? []
    const name = item.name ?? ""
    for (const e of entries) {
      const who = usersMap[e.changed_by] ?? e.changed_by
      const label = fieldLabels[e.field] ?? e.field
      out.push({
        주주ID: item.id,
        주주명: name,
        변경일시: e.changed_at,
        필드: label,
        이전값: e.old_value ?? "",
        이후값: e.new_value ?? "",
        작업자: who,
      })
    }
  }

  return out
}

export type ShareholderExportWorkbookContext = {
  formatHistoryInline: (_shareholderId: string) => string
  getLatestModifier: (_id: string) => string
  getLatestModifiedDate: (_id: string) => string
  allChanges: Record<string, ChangeEntry[]>
  usersMap: Record<string, string>
  fieldLabels: Record<string, string>
}

export function downloadShareholderRegistryWorkbook(params: {
  listName: string | null | undefined
  filterDescription: string
  rows: ShareholderRow[]
  options: ShareholderRegistryExportOptions
  fileBaseName: string
  ctx: ShareholderExportWorkbookContext
}): void {
  const { listName, filterDescription, rows, options, fileBaseName, ctx } =
    params

  const wb = XLSX.utils.book_new()

  if (options.includeSummarySheet) {
    const sumAoa = buildSummaryAoa({
      listName,
      filterDescription,
      options,
      rows,
    })
    const sumWs = XLSX.utils.aoa_to_sheet(sumAoa)
    sumWs["!cols"] = [{ wch: 22 }, { wch: 44 }, { wch: 12 }, { wch: 28 }]
    XLSX.utils.book_append_sheet(wb, sumWs, safeSheetName("요약"))
  }

  const keys = detailKeysOrdered(options)

  const makeDetailSheet = (subset: ShareholderRow[], title: string) => {
    const headerKeys = keys

    const exportRows = subset.map((item) => {
      const rec = buildDetailRecord({
        item,
        options,
        formatHistoryInline: ctx.formatHistoryInline,
        getLatestModifier: ctx.getLatestModifier,
        getLatestModifiedDate: ctx.getLatestModifiedDate,
      })

      return pickOrderedRow(rec, headerKeys)
    })

    const ws = XLSX.utils.json_to_sheet(exportRows, { header: headerKeys })
    ws["!cols"] = buildColInfosForKeys(headerKeys)

    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(title))
  }

  if (options.splitSheetsByPrimaryStatus) {
    makeDetailSheet(rows, "전체")
    for (const cat of PRIMARY_STATUS_OPTIONS) {
      const subset = rows.filter(
        (i) => getPrimaryStatusCategory(i.status) === cat,
      )
      if (subset.length === 0) continue
      makeDetailSheet(subset, cat)
    }
  } else {
    makeDetailSheet(rows, "상세")
  }

  if (options.changeHistoryMode === "separate_sheet") {
    const flat = buildChangeHistoryFlatRows({
      rows,
      allChanges: ctx.allChanges,
      usersMap: ctx.usersMap,
      fieldLabels: ctx.fieldLabels,
    })
    const chKeys = [
      "주주ID",
      "주주명",
      "변경일시",
      "필드",
      "이전값",
      "이후값",
      "작업자",
    ]
    const chWs = XLSX.utils.json_to_sheet(flat, { header: chKeys })
    chWs["!cols"] = [
      { wch: 38 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 28 },
      { wch: 28 },
      { wch: 16 },
    ]
    XLSX.utils.book_append_sheet(wb, chWs, safeSheetName("변경이력상세"))
  }

  const outName = `${fileBaseName}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, outName)
}
