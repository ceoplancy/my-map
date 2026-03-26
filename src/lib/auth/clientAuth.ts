import * as Sentry from "@sentry/nextjs"
import type { Session, User } from "@supabase/supabase-js"

import supabase from "@/lib/supabase/supabaseClient"
import { reportError } from "@/lib/reportError"

/** 액세스 JWT 만료 이 시각 이전이면 `refreshSession`(리프레시 토큰 사용)으로 재발급 시도 */
const ACCESS_TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

/** 클라이언트 인증 스냅샷 — React Query `QUERY_KEYS.auth` 단일 소스 */
export type AuthSnapshot = {
  user: User | null
  session: Session | null
}

/**
 * 사용자 식별은 `getUser()`(JWT 검증), API용 토큰은 `getSession()`으로 채웁니다.
 * Sentry 사용자 컨텍스트도 여기서만 설정합니다.
 */
export async function fetchAuth(): Promise<AuthSnapshot> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    reportError(userError)
    throw new Error(userError.message)
  }

  const user = userData.user ?? null
  if (user) {
    Sentry.setUser({
      email: user.email,
      id: user.id,
      metadata: user.user_metadata,
    })
  } else {
    Sentry.setUser(null)
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)

  return {
    user,
    session: sessionData.session ?? null,
  }
}

/**
 * Bearer / fetch용 — API Route에 넣을 **유효한** 액세스 토큰.
 * - 세션의 `expires_at` 기준으로 만료 **5분 전**이면 `refreshSession()`으로 액세스 토큰 재발급(리프레시 토큰 사용).
 * - `refreshSession`이 실패하면 `getUser()`로 서버 검증·세션 갱신을 한 번 더 유도한 뒤 세션에서 토큰을 읽습니다.
 * 사용자는 만료를 직접 알 필요가 없도록 API 호출 직전에 여기서 정리합니다.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)

  const session = data.session
  if (!session?.access_token) return null

  const expMs = session.expires_at ? session.expires_at * 1000 : 0
  const needsRefresh =
    !session.expires_at || expMs <= Date.now() + ACCESS_TOKEN_REFRESH_MARGIN_MS

  if (!needsRefresh) {
    return session.access_token
  }

  return refreshSessionOrFallbackAccessToken()
}

/**
 * `refreshSession` 후 실패 시 `getUser`로 세션을 유도하고 다시 `getSession`으로 토큰을 읽는다.
 * `getAccessToken`의 만료 갱신 경로와 `recoverAccessTokenAfterAuthFailure`가 공유한다.
 */
async function refreshSessionOrFallbackAccessToken(): Promise<string | null> {
  const { data: refreshed, error: refreshErr } =
    await supabase.auth.refreshSession()
  if (!refreshErr && refreshed.session?.access_token) {
    return refreshed.session.access_token
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) return null

  const { data: after } = await supabase.auth.getSession()

  return after.session?.access_token ?? null
}

/** API Route가 Bearer를 거절했을 때 재시도할지 판단 (토큰 만료·권한 등) */
export function isLikelyAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403
}

/**
 * 서버가 401/403을 반환했거나 `getAccessToken()`이 null일 때,
 * `refreshSession` 후 `getUser` 폴백으로 액세스 토큰을 다시 받는다.
 */
export async function recoverAccessTokenAfterAuthFailure(): Promise<
  string | null
> {
  return refreshSessionOrFallbackAccessToken()
}
