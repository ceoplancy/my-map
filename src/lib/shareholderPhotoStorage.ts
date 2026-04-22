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
  const ext = file.type.includes("png") ? "png" : "webp"
  const suffix = variant === "proxy" ? "-proxy" : ""
  const path = `${listId}/${shareholderId}${suffix}.${ext}`

  const { error } = await supabase.storage
    .from(SHAREHOLDER_PHOTO_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    })
  if (error) throw error

  const { data } = supabase.storage
    .from(SHAREHOLDER_PHOTO_BUCKET)
    .getPublicUrl(path)

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
