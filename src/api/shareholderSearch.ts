import supabase from "@/lib/supabase/supabaseClient"
import { Excel } from "@/types/excel"
import type { UserMetadata } from "@supabase/supabase-js"
import * as Sentry from "@sentry/nextjs"

const LIMIT = 25

/**
 * 지도 필터 권한과 동일한 범위에서 주주 검색 (이름·주소·휴대폰)
 */
export async function searchShareholdersForMap(
  q: string,
  userMetadata?: UserMetadata,
): Promise<Excel[]> {
  const term = q.trim()
  if (term.length < 2) return []

  const pattern = `%${term}%`

  let query = supabase.from("excel").select("*").limit(LIMIT)

  if (userMetadata) {
    const { allowedStatus, allowedCompany, role } = userMetadata as {
      allowedStatus?: string[]
      allowedCompany?: string[]
      role?: string
    }
    const isAdmin = String(role).includes("admin")

    if (allowedStatus?.length && !isAdmin) {
      query = query.in("status", allowedStatus)
    }
    if (allowedCompany?.length && !isAdmin) {
      query = query.in("company", allowedCompany)
    }
  }

  query = query.or(
    `name.ilike.${pattern},address.ilike.${pattern},phone.ilike.${pattern}`,
  )

  const { data, error } = await query

  if (error) {
    Sentry.captureException(error)
    Sentry.captureMessage("주주 검색에 실패했습니다.")

    return []
  }

  return (data ?? []) as Excel[]
}
