import { Database } from "@/types/db"
import { createClient } from "@supabase/supabase-js"

/**
 * 서버 전용: Vercel에는 `SUPABASE_SERVICE_ROLE_KEY` 설정 권장.
 * `NEXT_PUBLIC_*`로 서비스 롤 키를 넣지 마세요(클라이언트 번들 노출 위험).
 *
 * 빌드 시점에 env가 없으면 createClient가 실패하므로, 키가 비어 있을 때만
 * 더미 값으로 클라이언트를 만듭니다. 실제 Admin API 호출은 런타임에 유효한 키가 필요합니다.
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY ||
  ""
const supabaseKey =
  serviceRoleKey || "sb-build-placeholder-not-for-production-use"

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey)

export default supabaseAdmin
