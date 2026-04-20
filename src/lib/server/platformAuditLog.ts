import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * 서비스 롤(admin 클라이언트)로만 기록합니다. RLS로 직접 클라이언트 접근은 막혀 있습니다.
 */
export async function insertPlatformAuditLog(
  admin: SupabaseClient,
  entry: {
    actor_user_id: string | null
    action: string
    resource_type: string
    resource_id?: string | null
    details?: Record<string, unknown> | null
  },
): Promise<void> {
  const { error } = await admin.from("platform_audit_log").insert({
    actor_user_id: entry.actor_user_id,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id ?? null,
    details: entry.details ?? null,
  })
  if (error) {
    // 기록 실패로 본 요청까지 망가지지 않게
    console.error("[platform_audit_log]", error.message)
  }
}
