import * as XLSX from "xlsx"

import {
  PRIMARY_STATUS_OPTIONS,
  STATUS_DETAIL_OPTIONS,
  composeShareholderStatus,
} from "@/lib/shareholderStatus"

/** `parseSpreadsheetRow`와 동일한 한글 헤더(첫 시트 1행) */
export const SHAREHOLDER_IMPORT_TEMPLATE_HEADERS = [
  "주주ID",
  "이름",
  "회사명",
  "주소",
  "상태",
  "주식수",
  "메모",
  "담당",
] as const

function buildReadmeSheet(): XLSX.WorkSheet {
  const statusExamples = PRIMARY_STATUS_OPTIONS.flatMap((p) =>
    (STATUS_DETAIL_OPTIONS[p] ?? []).map((d) =>
      p === "미방문" ? "미방문" : composeShareholderStatus(p, d),
    ),
  )
  const uniqueExamples = [...new Set(statusExamples)].slice(0, 12)

  const rows: (string | number)[][] = [
    ["주주 명부 업로드 양식 (안내)"],
    [],
    [
      "업로드 시 첫 번째 시트만 사용합니다. 시트 이름은 바꿔도 되지만, 첫 시트가 데이터 시트여야 합니다.",
    ],
    [
      "첫 행은 아래 열 이름과 정확히 일치해야 합니다(한글 이름). 영문 별칭은 코드에서만 인식합니다.",
    ],
    [],
    ["열 이름", "설명"],
    [
      "주주ID",
      "선택. 비우면 신규. UUID 형식이면 재업로드 시 같은 주주 행을 덮어씁니다(변경 이력 API 미기록).",
    ],
    ["이름", "필수에 가깝게 권장."],
    ["회사명", "선택. 구분(회사)용."],
    [
      "주소",
      "필수에 가깝게 권장. 업로드 원문으로 저장되며, 이 화면에서 지오코딩(주소 변환)합니다.",
    ],
    [
      "상태",
      `1차만 또는 "1차 - 세부" 형식. 1차 완료 세부는 앱에서 의결권 서류·신분증 사진 유무에 맞춰 자동 정리되며, 엑셀에는 정규 4종 조합(예: 완료 - 의결권 서류 완료 · 신분증 확보 완료)을 넣을 수 있습니다. (예시: ${uniqueExamples.join(", ")})`,
    ],
    ["주식수", "숫자. 쉼표 없이 입력 권장."],
    ["메모", "선택."],
    ["담당", "선택. 마커(구분2)와 동일 용도."],
    [],
    ["1차 상태 종류", PRIMARY_STATUS_OPTIONS.join(", ")],
  ]

  return XLSX.utils.aoa_to_sheet(rows)
}

export function buildShareholderImportTemplateWorkbook(): XLSX.WorkBook {
  const headerRow = [...SHAREHOLDER_IMPORT_TEMPLATE_HEADERS]
  const exampleRow = [
    "",
    "홍길동",
    "㈜예시",
    "서울특별시 중구 세종대로 110",
    "미방문",
    100,
    "비고 예시",
    "A팀",
  ]
  const dataSheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow])
  dataSheet["!cols"] = headerRow.map((_, i) => ({
    wch: i === 0 ? 38 : i === 3 ? 36 : i === 6 ? 24 : 14,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, dataSheet, "주주명부")
  XLSX.utils.book_append_sheet(wb, buildReadmeSheet(), "양식설명")

  return wb
}

/** 브라우저에서 .xlsx 다운로드 */
export function downloadShareholderImportTemplateXlsx(
  filename = "주주명부_업로드양식.xlsx",
): void {
  const wb = buildShareholderImportTemplateWorkbook()
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
