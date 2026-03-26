import { createServerClient } from "@supabase/ssr"
import type { NextApiRequest, NextApiResponse } from "next"
import { serialize } from "cookie"
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

/** Pages API 전용 — `req.cookies` + `Set-Cookie`로 미들웨어와 동일한 세션을 읽는다. */
function createSupabaseServerClientFromApiCookies(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const anonKey = process.env.NEXT_PUBLIC_ANON_KEY ?? ""
  if (!url || !anonKey) return null

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        const c = req.cookies ?? {}

        return Object.entries(c).map(([name, value]) => ({
          name,
          value: value ?? "",
        }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.appendHeader("Set-Cookie", serialize(name, value, options))
        })
      },
    },
  })
}

/**
 * Pages API: 클라이언트가 보낸 Bearer와 동일한 쿠키 세션(미들웨어·`createBrowserClient`)을 모두 허용.
 * 모바일 Safari 등에서 Bearer가 비어 있거나 만료 직후 쿠키만 최신인 경우 401을 줄이기 위함.
 */
export async function getAuthUserFromApiRequest(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<{ user: User; token: string } | null> {
  const bearer = getBearerToken(req)
  if (bearer) {
    const fromBearer = await getAuthUser(bearer)
    if (fromBearer) return fromBearer
  }

  const supabase = createSupabaseServerClientFromApiCookies(req, res)
  if (!supabase) return null

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return null

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return null

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
