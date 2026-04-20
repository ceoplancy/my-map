import { COLORS } from "@/styles/global-style"

export const PRIMARY_STATUS_OPTIONS = [
  "미방문",
  "완료",
  "보류",
  "실패",
  "전자투표",
  "주주총회",
] as const

export type PrimaryStatus = (typeof PRIMARY_STATUS_OPTIONS)[number]

export const STATUS_DETAIL_OPTIONS: Record<PrimaryStatus, readonly string[]> = {
  미방문: ["미방문"],

  /** 구 명부·수기 입력에서 쓰이던 표기까지 포함 (형식 없이 한 줄만 들어온 경우) */
  완료: [
    "의결권 완료",
    "신분증 확보",
    "신분증 추후 수령",
    "방문완료",
    "수집완료",
    "처리완료",
    "진행완료",
    "위임완료",
    "서명완료",
    "직접서명완료",
    "의결완료",
    "결의완료",
  ],
  보류: ["거부", "재방문 요청", "부재중"],
  실패: ["완강한 거부", "방문 실패", "주소 오류"],
  전자투표: ["전자투표 완료", "전자투표 의사", "전자투표 의향"],
  주주총회: ["주주총회 참석 예정", "주주총회 참석 완료", "주주총회 불참 예정"],
}

const STATUS_DELIMITER = " - "

function isPrimaryStatus(v: string): v is PrimaryStatus {
  return (PRIMARY_STATUS_OPTIONS as readonly string[]).includes(v)
}

export function splitShareholderStatus(raw: string | null | undefined): {
  primary: PrimaryStatus
  detail: string
} {
  const status = (raw ?? "").trim()
  if (status === "") {
    return { primary: "미방문", detail: STATUS_DETAIL_OPTIONS.미방문[0] }
  }
  if (status.includes(STATUS_DELIMITER)) {
    const [head, ...tail] = status.split(STATUS_DELIMITER)
    if (isPrimaryStatus(head)) {
      const detail = tail.join(STATUS_DELIMITER).trim()
      if (detail.length > 0) {
        return { primary: head, detail }
      }

      return { primary: head, detail: STATUS_DETAIL_OPTIONS[head][0] }
    }
  }
  if (isPrimaryStatus(status)) {
    return { primary: status, detail: STATUS_DETAIL_OPTIONS[status][0] }
  }

  // 기존 데이터(단일 상세 텍스트) 호환
  for (const primary of PRIMARY_STATUS_OPTIONS) {
    const detailList = STATUS_DETAIL_OPTIONS[primary]
    if (detailList.includes(status)) {
      return { primary, detail: status }
    }
  }

  /** 한 줄 자유 텍스트(구 데이터) — 알려진 세부값 목록에 없을 때만 키워드로 추정 */
  if (/완강한\s*거부|방문\s*실패|주소\s*오류/.test(status)) {
    return { primary: "실패", detail: STATUS_DETAIL_OPTIONS["실패"][0] }
  }
  if (/전자투표/.test(status)) {
    return { primary: "전자투표", detail: STATUS_DETAIL_OPTIONS["전자투표"][0] }
  }
  if (/주주총회|주총/.test(status)) {
    return { primary: "주주총회", detail: STATUS_DETAIL_OPTIONS["주주총회"][0] }
  }
  if (/(거부|부재중|재방문)/.test(status) && !/완강한\s*거부/.test(status)) {
    return { primary: "보류", detail: STATUS_DETAIL_OPTIONS["보류"][0] }
  }
  if (!/미\s*완료|미완료|미\s*수집/.test(status)) {
    if (
      /(의결|위임|신분증|방문|수집|처리|진행|서명|결의|의결권).*완료|완료.*(의결|위임|신분증)/.test(
        status,
      )
    ) {
      return { primary: "완료", detail: STATUS_DETAIL_OPTIONS["완료"][0] }
    }
  }

  return { primary: "미방문", detail: STATUS_DETAIL_OPTIONS.미방문[0] }
}

export function composeShareholderStatus(
  primary: PrimaryStatus,
  detail: string,
): string {
  const normalizedDetail = detail.trim()
  if (primary === "미방문") return "미방문"
  if (normalizedDetail === "") return primary

  return `${primary}${STATUS_DELIMITER}${normalizedDetail}`
}

/** 세부 값이 비어 있거나 해당 1차 상태 허용 목록에 없으면 false */
export function isAllowedStatusDetail(
  primary: PrimaryStatus,
  detail: string | null | undefined,
): boolean {
  const d = (detail ?? "").trim()
  if (!d) return false

  return (STATUS_DETAIL_OPTIONS[primary] ?? []).includes(d)
}

export function getPrimaryStatusCategory(
  raw: string | null | undefined,
): PrimaryStatus {
  return splitShareholderStatus(raw).primary
}

/** 상세 표·지도 요약 등에서 동일한 톤으로 쓰는 상태 칩 배경색 */
export function getShareholderStatusChipBackground(
  raw: string | null | undefined,
): string {
  const primary = getPrimaryStatusCategory(raw)
  switch (primary) {
    case "전자투표":
      return COLORS.purple[50]
    case "주주총회":
      return COLORS.purple[100]
    default:
      break
  }
  switch (primary) {
    case "완료":
      return COLORS.green[50]
    case "미방문":
      return COLORS.blue[50]
    case "보류":
      return COLORS.yellow[50]
    case "실패":
      return COLORS.red[50]
    default:
      return COLORS.gray[50]
  }
}

/** 상세 표·지도 요약 등에서 동일한 톤으로 쓰는 상태 칩 글자색 */
export function getShareholderStatusChipColor(
  raw: string | null | undefined,
): string {
  const primary = getPrimaryStatusCategory(raw)
  switch (primary) {
    case "완료":
      return COLORS.green[700]
    case "미방문":
      return COLORS.blue[700]
    case "보류":
      return COLORS.yellow[700]
    case "실패":
      return COLORS.red[700]
    case "전자투표":
      return COLORS.purple[700]
    case "주주총회":
      return COLORS.purple[800]
    default:
      return COLORS.gray[700]
  }
}
