import { createServerClient } from "@supabase/ssr"
import type { NextApiRequest, NextApiResponse } from "next"
import { parse, serialize } from "cookie"
import {
  createSupabaseAdmin,
  createSupabaseAnon,
} from "@/lib/supabase/supabaseServer"
import type { Session, User } from "@supabase/supabase-js"

export { isPlatformAdminMetadata } from "@/lib/auth/platformRole"

type AuthUserWithToken = { user: User; token: string }

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
): Promise<AuthUserWithToken | null> {
  const client = createSupabaseAnon()
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token)

  if (error || !user) return null

  return { user, token }
}

/**
 * Supabase SSR은 세션을 여러 청크 쿠키로 나눕니다. Next `req.cookies`만 쓰면 일부가 빠질 수 있어
 * 원시 `Cookie` 헤더를 파싱해 전달한다.
 */
function getAllCookiePairsFromApiRequest(req: NextApiRequest): {
  name: string
  value: string
}[] {
  const raw = req.headers.cookie
  if (raw && typeof raw === "string") {
    const parsed = parse(raw)

    return Object.entries(parsed).map(([name, value]) => ({
      name,
      value: value ?? "",
    }))
  }

  const c = req.cookies ?? {}

  return Object.entries(c).map(([name, value]) => ({
    name,
    value: value ?? "",
  }))
}

/** Pages API 전용 — `Cookie` + `Set-Cookie`로 미들웨어·브라우저와 동일한 세션을 읽는다. */
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
        return getAllCookiePairsFromApiRequest(req)
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.appendHeader("Set-Cookie", serialize(name, value, options))
        })
      },
    },
  })
}

type CookieSupabaseClient = NonNullable<
  ReturnType<typeof createSupabaseServerClientFromApiCookies>
>

function authFromRefreshedSession(
  session: Session | null,
): AuthUserWithToken | null {
  if (!session?.user || !session.access_token) return null

  return { user: session.user, token: session.access_token }
}

/** `getUser()`로 확정된 사용자에 대해 세션 토큰 확보 (없으면 refresh 1회). */
async function accessTokenForResolvedUser(
  supabase: CookieSupabaseClient,
  user: User,
): Promise<AuthUserWithToken | null> {
  let token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) {
    const { data: refreshed, error: refreshErr } =
      await supabase.auth.refreshSession()
    if (!refreshErr && refreshed.session?.access_token) {
      token = refreshed.session.access_token
    }
  }

  return token ? { user, token } : null
}

/**
 * 쿠키 기반 SSR 클라이언트에서 user + access_token 확보.
 * - `getUser()` 직후 `getSession()`에 토큰이 비는 경우(SSR/모바일·청크 쿠키) → `refreshSession` 1회.
 * - `getUser()` 실패 시에도 리프레시 토큰이 유효하면 `refreshSession`으로 복구 (동시 요청 레이스 등).
 */
async function getAuthUserAndTokenFromCookieClient(
  supabase: CookieSupabaseClient,
): Promise<AuthUserWithToken | null> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (!userErr && user) {
    return accessTokenForResolvedUser(supabase, user)
  }

  const { data: refreshed, error: refreshErr } =
    await supabase.auth.refreshSession()
  if (refreshErr) return null

  return authFromRefreshedSession(refreshed.session ?? null)
}

/**
 * Pages API: 쿠키 세션과 Bearer를 모두 시도해 합치한다.
 * - 미들웨어가 갱신한 쿠키가 최신인데 Authorization JWT가 만료된 경우 → 쿠키 우선(동일 user.id).
 * - 로그인 직후 첫 요청에서 쿠키가 아직 이전 세션인데 Authorization은 새 JWT인 경우 → Bearer 우선(다른 user.id).
 */
export async function getAuthUserFromApiRequest(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthUserWithToken | null> {
  const supabase = createSupabaseServerClientFromApiCookies(req, res)
  let fromCookie: AuthUserWithToken | null = null
  if (supabase) {
    fromCookie = await getAuthUserAndTokenFromCookieClient(supabase)
  }

  const bearer = getBearerToken(req)
  let fromBearer: AuthUserWithToken | null = null
  if (bearer) {
    fromBearer = await getAuthUser(bearer)
  }

  if (!fromCookie && !fromBearer) return null
  if (!fromCookie) return fromBearer
  if (!fromBearer) return fromCookie
  if (fromCookie.user.id !== fromBearer.user.id) {
    return fromBearer
  }

  return fromCookie
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
