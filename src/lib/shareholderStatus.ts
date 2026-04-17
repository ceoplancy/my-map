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
  완료: ["의결권 완료", "신분증 확보", "신분증 추후 수령"],
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
