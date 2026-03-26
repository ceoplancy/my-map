import * as Sentry from "@sentry/nextjs"
import type { Session, User } from "@supabase/supabase-js"

import supabase from "@/lib/supabase/supabaseClient"
import { reportError } from "@/lib/reportError"

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
 * Bearer / fetch용 — API Route에 넣을 액세스 토큰.
 * `getSession()`만 쓰면 만료 직전·만료 토큰이 그대로 나가 서버에서 `auth_invalid_token`이 날 수 있어,
 * 만료 임박(60초 이내)이면 `refreshSession` 후 토큰을 반환합니다.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)

  let session = data.session
  if (!session?.access_token) return null

  const expMs = session.expires_at ? session.expires_at * 1000 : 0
  const refreshBufferMs = 60_000
  if (!session.expires_at || expMs < Date.now() + refreshBufferMs) {
    const { data: ref, error: refErr } = await supabase.auth.refreshSession()
    if (refErr) return null
    session = ref.session ?? session
  }

  return session?.access_token ?? null
}
