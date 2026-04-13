/**
 * 공개 사이트 베이스 URL (canonical, OG). 끝의 `/` 없음.
 * `next.config.js`에서 `NEXT_PUBLIC_SITE_URL`로 주입됩니다.
 */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const base = raw.replace(/\/$/, "")

  if (base) {
    return base
  }

  return "http://localhost:3000"
}
