import { createServerClient } from "@supabase/ssr"
import type { NextApiRequest, NextApiResponse } from "next"
import { parse, serialize } from "cookie"
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

/**
 * Pages API: **쿠키 세션을 먼저** 검증한 뒤 Bearer로 폴백.
 * 미들웨어가 갱신한 쿠키가 최신인데, 클라이언트가 보내는 Authorization JWT가 아직 만료된 값일 수 있어
 * Bearer 우선이면 401이 난다.
 */
export async function getAuthUserFromApiRequest(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<{ user: User; token: string } | null> {
  const supabase = createSupabaseServerClientFromApiCookies(req, res)
  if (supabase) {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (!userErr && user) {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (token) return { user, token }
    }
  }

  const bearer = getBearerToken(req)
  if (bearer) {
    const fromBearer = await getAuthUser(bearer)
    if (fromBearer) return fromBearer
  }

  return null
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
