import { getAccessToken } from "@/lib/auth/clientAuth"
import supabase from "@/lib/supabase/supabaseClient"

export const SHAREHOLDER_PHOTO_BUCKET = "shareholder-photos"

/** 신분증 등 기존 `image` 컬럼 — `proxy`는 의결권 서류 등 `proxy_document_image` */
export type ShareholderPhotoVariant = "id" | "proxy"

export async function uploadShareholderPhotoAndGetPublicUrl(
  file: File,
  listId: string,
  shareholderId: string,
  variant: ShareholderPhotoVariant = "id",
): Promise<string> {
  const access = await getAccessToken()
  if (!access) {
    throw new Error("로그인이 필요합니다.")
  }

  const signRes = await fetch("/api/workspace/shareholder-photo/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify({
      listId,
      shareholderId,
      variant,
      contentType: file.type || undefined,
    }),
  })
  if (!signRes.ok) {
    let msg = signRes.statusText
    try {
      const j = (await signRes.json()) as { error?: string }
      if (j.error) msg = j.error
    } catch {
      void 0
    }
    throw new Error(msg)
  }
  const signed = (await signRes.json()) as {
    bucket: string
    path: string
    token: string
  }

  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type || undefined,
    })
  if (error) throw error

  const { data } = supabase.storage
    .from(SHAREHOLDER_PHOTO_BUCKET)
    .getPublicUrl(signed.path)

  return data.publicUrl
}

export async function removeShareholderPhotoObject(
  listId: string,
  shareholderId: string,
  imageUrl: string | null,
): Promise<void> {
  if (!imageUrl?.includes(SHAREHOLDER_PHOTO_BUCKET)) return

  const marker = `/object/public/${SHAREHOLDER_PHOTO_BUCKET}/`
  const idx = imageUrl.indexOf(marker)
  if (idx < 0) return
  const path = decodeURIComponent(imageUrl.slice(idx + marker.length))
  if (!path.startsWith(`${listId}/`)) return

  const { error } = await supabase.storage
    .from(SHAREHOLDER_PHOTO_BUCKET)
    .remove([path])
  if (error) throw error
}
