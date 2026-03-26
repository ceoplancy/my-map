import type { NextApiRequest } from "next"
import {
  createSupabaseAdmin,
  createSupabaseAnon,
} from "@/lib/supabase/supabaseServer"
import type { User } from "@supabase/supabase-js"

/** 요청에서 Bearer 토큰 추출 */
export function getBearerToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization

  return auth?.startsWith("Bearer ") ? auth.slice(7) : null
}

/**
 * Bearer 액세스 토큰으로 사용자 조회.
 * 전역 `Authorization` 헤더 대신 `getUser(jwt)`로 JWT만 검증 — 서버리스에서 세션과 불일치 나는 경우 방지.
 */
export async function getAuthUser(
  token: string,
): Promise<{ user: User; token: string } | null> {
  const client = createSupabaseAnon()
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token)

  if (error || !user) return null

  return { user, token }
}

/** 통합 관리자(service_admin): workspace_id가 NULL인 멤버십이 있는지 확인 */
export async function isServiceAdmin(accessToken: string): Promise<boolean> {
  const client = createSupabaseAnon()
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken)
  if (error || !user) return false
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from("workspace_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "service_admin")
    .is("workspace_id", null)
    .limit(1)

  return (data?.length ?? 0) > 0
}
