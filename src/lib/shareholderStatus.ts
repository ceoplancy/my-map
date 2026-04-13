import { COLORS } from "@/styles/global-style"

/** 세부 사유 (실패·보류 공통) */
export const STATUS_FAILURE_HOLD_DETAILS = [
  "완강한 거부",
  "주소 상이",
  "부재중",
  "방문 불가",
] as const

export const E_VOTE_LEAVES = ["전자투표 완료", "전자투표 명시"] as const

export const AGM_LEAVES = ["주총 참여", "주총 참여 명시"] as const

export const PROXY_COMPLETE = "의결권 위임 완료"

const SEP = " · "

export type PrimaryStatusGroup =
  | "미방문"
  | "전자투표"
  | "주총"
  | "의결권_위임"
  | "실패"
  | "보류"

/** 지도 마커 4종과 매핑 */
export type MarkerTone = "미방문" | "완료" | "보류" | "실패"

export function getMarkerToneForStatus(status: string | null): MarkerTone {
  const s = (status ?? "").trim()
  if (!s || s === "미방문") return "미방문"

  if (s === "완료" || s === PROXY_COMPLETE) return "완료"

  if (
    E_VOTE_LEAVES.includes(s as (typeof E_VOTE_LEAVES)[number]) ||
    AGM_LEAVES.includes(s as (typeof AGM_LEAVES)[number])
  ) {
    return "완료"
  }

  if (s.startsWith("보류") || s === "보류") return "보류"

  return "실패"
}

/** 통계 카드 — 의결권 위임 완료로 집계할 값 (구 '완료' 포함) */
export function isProxyDelegationCompleted(status: string | null | undefined) {
  const s = (status ?? "").trim()

  return s === "완료" || s === PROXY_COMPLETE
}

export function parseStatusToSteps(stored: string | null | undefined): {
  primary: PrimaryStatusGroup
  secondary: string
} {
  const s = (stored ?? "").trim()
  if (!s || s === "미방문") {
    return { primary: "미방문", secondary: "" }
  }

  if (s === "완료" || s === PROXY_COMPLETE) {
    return { primary: "의결권_위임", secondary: PROXY_COMPLETE }
  }

  if ((E_VOTE_LEAVES as readonly string[]).includes(s)) {
    return { primary: "전자투표", secondary: s }
  }

  if ((AGM_LEAVES as readonly string[]).includes(s)) {
    return { primary: "주총", secondary: s }
  }

  if (s.startsWith(`실패${SEP}`)) {
    return { primary: "실패", secondary: s.slice(`실패${SEP}`.length) }
  }

  if (s.startsWith(`보류${SEP}`)) {
    return { primary: "보류", secondary: s.slice(`보류${SEP}`.length) }
  }

  if (s === "실패") {
    return { primary: "실패", secondary: "" }
  }

  if (s === "보류") {
    return { primary: "보류", secondary: "" }
  }

  return { primary: "미방문", secondary: s }
}

export function buildStatusFromSteps(
  primary: PrimaryStatusGroup,
  secondary: string,
): string {
  switch (primary) {
    case "미방문":
      return "미방문"
    case "의결권_위임":
      return PROXY_COMPLETE
    case "전자투표":
      return (E_VOTE_LEAVES as readonly string[]).includes(secondary)
        ? secondary
        : E_VOTE_LEAVES[0]
    case "주총":
      return (AGM_LEAVES as readonly string[]).includes(secondary)
        ? secondary
        : AGM_LEAVES[0]
    case "실패": {
      const d = secondary.trim()
      if (!d) return "실패"

      return `실패${SEP}${d}`
    }
    case "보류": {
      const d = secondary.trim()
      if (!d) return "보류"

      return `보류${SEP}${d}`
    }
    default:
      return "미방문"
  }
}

export type StatusVisualKind =
  | "not_visited"
  | "proxy_done"
  | "evote_agm"
  | "pending"
  | "failed"
  | "unknown"

export function getStatusVisualKind(
  status: string | null | undefined,
): StatusVisualKind {
  const s = (status ?? "").trim()
  if (!s || s === "미방문") return "not_visited"
  if (s === "완료" || s === PROXY_COMPLETE) return "proxy_done"
  if (
    (E_VOTE_LEAVES as readonly string[]).includes(s) ||
    (AGM_LEAVES as readonly string[]).includes(s)
  ) {
    return "evote_agm"
  }
  if (s.startsWith("보류") || s === "보류") return "pending"
  if (s.startsWith("실패") || s === "실패") return "failed"

  return "unknown"
}

export function getStatusBadgeColors(status: string | null | undefined) {
  const k = getStatusVisualKind(status)
  switch (k) {
    case "not_visited":
      return { bg: COLORS.blue[50], fg: COLORS.blue[700] }
    case "proxy_done":
      return { bg: COLORS.green[50], fg: COLORS.green[700] }
    case "evote_agm":
      return { bg: COLORS.purple[50], fg: COLORS.purple[700] }
    case "pending":
      return { bg: COLORS.yellow[50], fg: COLORS.yellow[700] }
    case "failed":
      return { bg: COLORS.red[50], fg: COLORS.red[700] }
    default:
      return { bg: COLORS.gray[100], fg: COLORS.gray[700] }
  }
}

/** 필터·관리자 등 전체 선택지 (DB에 저장되는 문자열과 동일) */
export function getAllSelectableStatusValues(): string[] {
  const prefixed = STATUS_FAILURE_HOLD_DETAILS.flatMap((d) => [
    `실패${SEP}${d}`,
    `보류${SEP}${d}`,
  ])

  return [
    "미방문",
    ...E_VOTE_LEAVES,
    ...AGM_LEAVES,
    PROXY_COMPLETE,
    ...prefixed,
    "실패",
    "보류",
    "완료",
  ]
}
