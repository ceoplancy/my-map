const storageKey = (workspaceId: string) => `public_drop_qr_url_${workspaceId}`

export type StoredPublicDropQr = {
  url: string
  savedAt: number
}

export function readPublicDropQrUrl(workspaceId: string): string | null {
  if (typeof window === "undefined" || !workspaceId) return null
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return null
    const j = JSON.parse(raw) as StoredPublicDropQr
    if (j && typeof j.url === "string" && j.url.startsWith("http")) return j.url
  } catch {
    void 0
  }

  return null
}

export function writePublicDropQrUrl(workspaceId: string, url: string): void {
  if (typeof window === "undefined" || !workspaceId || !url) return
  const payload: StoredPublicDropQr = { url, savedAt: Date.now() }
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(payload))
}
