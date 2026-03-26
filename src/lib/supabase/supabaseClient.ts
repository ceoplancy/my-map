import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/types/db"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_ANON_KEY || ""

/**
 * 브라우저 전용. `@supabase/ssr` 기본 설정으로 세션은 localStorage가 아니라
 * 쿠키(document.cookie)에 저장됩니다. 미들웨어에서 토큰 갱신을 처리합니다.
 */
const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey)

export default supabase
