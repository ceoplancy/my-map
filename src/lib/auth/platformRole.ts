import type { User } from "@supabase/supabase-js"

/**
 * `user_metadata.role` 기반 플랫폼 관리자(root_admin, admin 등).
 * `includes("admin")` — root_admin 문자열에도 admin이 포함됨.
 */
export function isPlatformAdminMetadata(
  user: User | null | undefined,
): boolean {
  if (!user) return false

  return String(user.user_metadata?.role ?? "").includes("admin")
}
