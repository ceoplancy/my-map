/**
 * 관리자 라우트 단일 소스
 * - 통합 관리: /admin/* (플랫폼 전체, 서비스 관리자 전용)
 * - 워크스페이스 관리: /workspaces/[workspaceId]/admin/* (해당 워크스페이스 전용)
 *
 * ADMIN.ROOT: 진입점(리다이렉트), INTEGRATED: 대시보드, SIGNUP_REQUESTS: 가입 승인,
 * USERS: 사용자 관리, WORKSPACES: 워크스페이스 목록/관리
 */
export const ADMIN = {
  ROOT: "/admin",
  INTEGRATED: "/admin/integrated",
  SIGNUP_REQUESTS: "/admin/signup-requests",
  USERS: "/admin/users",
  WORKSPACES: "/admin/workspaces",
  AUDIT_LOG: "/admin/audit-log",
} as const

/** 통합 관리 경로 접두사 (isIntegratedRoute 등에서 사용) */
export const INTEGRATED_PATH_PREFIXES: readonly string[] = [
  ADMIN.INTEGRATED,
  ADMIN.SIGNUP_REQUESTS,
  ADMIN.USERS,
  ADMIN.WORKSPACES,
  ADMIN.AUDIT_LOG,
]

/** 워크스페이스 관리 하위 세그먼트 (경로 마지막 부분) */
export const WORKSPACE_ADMIN_SEGMENTS = [
  "lists",
  "shareholders",
  "excel-import",
  "members",
  "users",
  "signup-requests",
  "change-history",
  "field-agent-agreement",
  "public-photo-drop-qr",
] as const

export type WorkspaceAdminSegment = (typeof WORKSPACE_ADMIN_SEGMENTS)[number]

/** 세그먼트 → 화면 라벨 */
export const WORKSPACE_ADMIN_SEGMENT_LABELS: Record<
  WorkspaceAdminSegment | string,
  string
> = {
  lists: "주주명부 목록",
  shareholders: "주주명부 관리",
  "excel-import": "파일 가져오기",
  members: "워크스페이스 멤버",
  users: "사용자 관리",
  "signup-requests": "가입 승인",
  "change-history": "변경 이력",
  "field-agent-agreement": "현장요원 동의문",
  "public-photo-drop-qr": "공개 접수 QR",
}

/** 워크스페이스 관리 베이스 경로 */
export const getWorkspaceAdminBase = (workspaceId: string) =>
  `/workspaces/${workspaceId}/admin`
