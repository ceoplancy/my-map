import type { NextApiRequest } from "next"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"
import type { User } from "@supabase/supabase-js"

/** 요청에서 Bearer 토큰 추출 */
export function getBearerToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization

  return auth?.startsWith("Bearer ") ? auth.slice(7) : null
}

/** 토큰으로 Supabase 사용자 조회. 없으면 null */
export async function getAuthUser(
  token: string,
): Promise<{ user: User; token: string } | null> {
  const client = createSupabaseWithToken(token)
  const {
    data: { user },
  } = await client.auth.getUser()

  return user ? { user, token } : null
}

/** 통합 관리자(service_admin): workspace_id가 NULL인 멤버십이 있는지 확인 */
export async function isServiceAdmin(accessToken: string): Promise<boolean> {
  const client = createSupabaseWithToken(accessToken)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return false
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
