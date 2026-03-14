import type { WorkspaceRole } from "@/types/db"

/** 워크스페이스 역할 표시 라벨 (단일 소스) */
export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  service_admin: "서비스 관리자",
  top_admin: "최고 관리자",
  admin: "관리자",
  field_agent: "용역",
}
