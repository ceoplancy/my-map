/**
 * Auth user_metadata.role (platform-level, not workspace_role).
 * Used by admin users API and user edit forms.
 */
export type AuthRole = "root_admin" | "admin" | "user"

export const AUTH_ROLES: AuthRole[] = ["root_admin", "admin", "user"]

export const AUTH_ROLE_LABELS: Record<AuthRole, string> = {
  root_admin: "최고 관리자",
  admin: "관리자",
  user: "일반 사용자",
}
