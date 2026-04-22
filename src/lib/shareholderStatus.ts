import { COLORS } from "@/styles/global-style"

export const PRIMARY_STATUS_OPTIONS = [
  "미방문",
  "완료",
  "보류",
  "실패",
  "전자투표",
  "주주총회",
] as const

/**
 * 저장 `status` 문자열 ↔ 1차 분류
 *
 * - 신규·권장: composeShareholderStatus(1차, 세부) → "1차 - 세부" (STATUS_DELIMITER)
 * - 1차 **완료** 세부: `completionDetailFromPhotos` — 의결권 서류·신분증 **사진 URL**로만 정함
 * - 예전 데이터: 세부만 있거나 한 줄 자유 텍스트 → splitShareholderStatus /
 *   getPrimaryStatusCategory 로 1차 추정
 *
 * 목록·집계·statusPrimaryFilter 필터는 모두 getPrimaryStatusCategory(= split…primary) 기준.
 */
export type PrimaryStatus = (typeof PRIMARY_STATUS_OPTIONS)[number]

/** 완료(1차) 세부 — 사진 유무로 만들어지는 4가지 정규 라벨(의결권 축 · 신분증 축) */
export const COMPLETION_DOC_LABEL_DONE = "의결권 서류 완료"
export const COMPLETION_DOC_LABEL_HOLD = "의결권 서류 보류"
export const COMPLETION_ID_LABEL_DONE = "신분증 확보 완료"
export const COMPLETION_ID_LABEL_HOLD = "신분증 보류"

export const COMPLETION_DETAIL_JOINER = " · "

export function composeCompletionDetail(
  doc: "done" | "hold",
  id: "done" | "hold",
): string {
  const docPart =
    doc === "done" ? COMPLETION_DOC_LABEL_DONE : COMPLETION_DOC_LABEL_HOLD
  const idPart =
    id === "done" ? COMPLETION_ID_LABEL_DONE : COMPLETION_ID_LABEL_HOLD

  return `${docPart}${COMPLETION_DETAIL_JOINER}${idPart}`
}

/**
 * 1차 "완료"의 저장 세부 문자열 — **의결권 서류·신분증 사진 URL** 유무로만 정합니다.
 * (`proxy_document_image` = 의결권 서류, `image` = 신분증)
 */
export function completionDetailFromPhotos(
  proxyDocumentImageUrl: string | null | undefined,
  idCardImageUrl: string | null | undefined,
): string {
  const doc = proxyDocumentImageUrl?.trim() ? "done" : "hold"
  const id = idCardImageUrl?.trim() ? "done" : "hold"

  return composeCompletionDetail(doc, id)
}

type ShareholderPhotoFields = {
  status: string | null
  image?: string | null
  proxy_document_image?: string | null
}

/**
 * 현재 행이 1차 완료일 때만, 사진 필드 변경 후의 `status` 전체 문자열을 돌려줍니다.
 * 세부가 기존과 같으면 `null`(불필요한 업데이트·이력 생략).
 */
export function nextShareholderStatusAfterPhotoFieldsChange(
  row: ShareholderPhotoFields,
  patch: Partial<{ image: string | null; proxy_document_image: string | null }>,
): string | null {
  if (getPrimaryStatusCategory(row.status) !== "완료") return null
  const nextImage =
    patch.image !== undefined ? patch.image : (row.image ?? null)
  const nextProxy =
    patch.proxy_document_image !== undefined
      ? patch.proxy_document_image
      : (row.proxy_document_image ?? null)
  const next = composeShareholderStatus(
    "완료",
    completionDetailFromPhotos(nextProxy, nextImage),
  )
  const cur = (row.status ?? "").trim()
  if (next === cur) return null

  return next
}

const CANONICAL_COMPLETION_DETAILS = [
  composeCompletionDetail("done", "done"),
  composeCompletionDetail("done", "hold"),
  composeCompletionDetail("hold", "done"),
  composeCompletionDetail("hold", "hold"),
] as const

/** 지도·편집 저장 시 완료는 이 4가지 문자열만 허용 (기존 명부 값은 별도 허용 목록) */
export function isCanonicalCompletionDetail(detail: string | null | undefined) {
  const d = (detail ?? "").trim()

  return (CANONICAL_COMPLETION_DETAILS as readonly string[]).includes(d)
}

const LEGACY_COMPLETE_DETAILS = [
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
] as const

export function getCanonicalCompletionDetails(): readonly string[] {
  return CANONICAL_COMPLETION_DETAILS
}

export type CompletionAxis = "done" | "hold" | null

/** 기존 세부 문자열에서 체크리스트 초깃값 추정 (없으면 null) */
export function inferCompletionAxes(detail: string | null | undefined): {
  doc: CompletionAxis
  id: CompletionAxis
} {
  const d = (detail ?? "").trim()
  if (!d) return { doc: null, id: null }

  if (isCanonicalCompletionDetail(d)) {
    const [a, b] = d.split(COMPLETION_DETAIL_JOINER).map((s) => s.trim())

    return {
      doc:
        a === COMPLETION_DOC_LABEL_DONE
          ? "done"
          : a === COMPLETION_DOC_LABEL_HOLD
            ? "hold"
            : null,
      id:
        b === COMPLETION_ID_LABEL_DONE
          ? "done"
          : b === COMPLETION_ID_LABEL_HOLD
            ? "hold"
            : null,
    }
  }

  let doc: CompletionAxis = null
  let id: CompletionAxis = null

  if (/의결권\s*서류\s*보류|의결권\s*보류/.test(d)) doc = "hold"
  else if (
    /의결권\s*완료|의결완료|결의완료|위임완료|서명완료|직접서명완료/.test(d)
  )
    doc = "done"
  else if (/의결|결의|위임|서명/.test(d) && /완료/.test(d)) doc = "done"

  if (/신분증\s*보류|신분증\s*추후|추후\s*수령/.test(d)) id = "hold"
  else if (/신분증\s*확보/.test(d)) id = "done"

  if (/방문완료|수집완료|처리완료|진행완료/.test(d)) {
    if (doc === null) doc = "done"
    if (id === null) id = "done"
  }

  return { doc, id }
}

export const STATUS_DETAIL_OPTIONS: Record<PrimaryStatus, readonly string[]> = {
  미방문: ["미방문"],

  /** 신규 저장은 4가지 조합만; 구 데이터 문자열은 필터·호환용으로 유지 */
  완료: [...CANONICAL_COMPLETION_DETAILS, ...LEGACY_COMPLETE_DETAILS],
  보류: ["거부", "재방문 요청", "부재중"],
  실패: ["완강한 거부", "방문 실패", "주소 오류"],

  /** 「전자투표 의향」은 구 데이터 호환용으로만 인식·저장 시 「전자투표 의사」로 통일 */
  전자투표: ["전자투표 완료", "전자투표 의사"],

  /**
   * 신규 선택은 두 가지만. 구 명부 값(참석 완료·불참 예정·구 참석 예정 문구)은 허용·필터용으로 유지.
   */
  주주총회: [
    "참석 예정",
    "주주총회 참석 의향",
    "주주총회 참석 예정",
    "주주총회 참석 완료",
    "주주총회 불참 예정",
  ],
}

/** 지도 등 편집 UI에서 주주총회 세부 칩으로만 노출할 값 */
export const AGMEETING_DETAIL_OPTIONS_FOR_UI = [
  "참석 예정",
  "주주총회 참석 의향",
] as const

const STATUS_DELIMITER = " - "

const E_VOTE_DETAIL_LEGACY_UI = "전자투표 의향"
const E_VOTE_DETAIL_CANONICAL_UI = "전자투표 의사"

/** 구 명부·UI의 「전자투표 의향」→「전자투표 의사」와 동일 취급 */
export function normalizeElectronicVoteDetail(detail: string): string {
  const t = detail.trim()

  return t === E_VOTE_DETAIL_LEGACY_UI ? E_VOTE_DETAIL_CANONICAL_UI : detail
}

function isPrimaryStatus(v: string): v is PrimaryStatus {
  return (PRIMARY_STATUS_OPTIONS as readonly string[]).includes(v)
}

export function splitShareholderStatus(raw: string | null | undefined): {
  primary: PrimaryStatus
  detail: string
} {
  let status = (raw ?? "").trim()
  const evLegacyFull = `전자투표${STATUS_DELIMITER}${E_VOTE_DETAIL_LEGACY_UI}`
  const evCanonFull = `전자투표${STATUS_DELIMITER}${E_VOTE_DETAIL_CANONICAL_UI}`
  if (status === evLegacyFull) {
    status = evCanonFull
  }
  if (status === E_VOTE_DETAIL_LEGACY_UI) {
    status = E_VOTE_DETAIL_CANONICAL_UI
  }
  if (status === "") {
    return { primary: "미방문", detail: STATUS_DETAIL_OPTIONS.미방문[0] }
  }
  if (status.includes(STATUS_DELIMITER)) {
    const [head, ...tail] = status.split(STATUS_DELIMITER)
    if (isPrimaryStatus(head)) {
      const detailRaw = tail.join(STATUS_DELIMITER).trim()
      const detail =
        head === "전자투표"
          ? normalizeElectronicVoteDetail(detailRaw)
          : detailRaw
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
      return {
        primary,
        detail:
          primary === "전자투표"
            ? normalizeElectronicVoteDetail(status)
            : status,
      }
    }
    if (primary === "전자투표" && status === E_VOTE_DETAIL_LEGACY_UI) {
      return { primary: "전자투표", detail: E_VOTE_DETAIL_CANONICAL_UI }
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
  let normalizedDetail = detail.trim()
  if (primary === "전자투표") {
    normalizedDetail = normalizeElectronicVoteDetail(normalizedDetail)
  }
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
  const check = primary === "전자투표" ? normalizeElectronicVoteDetail(d) : d

  return (STATUS_DETAIL_OPTIONS[primary] ?? []).includes(check)
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
