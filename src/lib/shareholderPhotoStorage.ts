import supabase from "@/lib/supabase/supabaseClient"

export const SHAREHOLDER_PHOTO_BUCKET = "shareholder-photos"

export async function uploadShareholderPhotoAndGetPublicUrl(
  file: File,
  listId: string,
  shareholderId: string,
): Promise<string> {
  const ext = file.type.includes("png") ? "png" : "webp"
  const path = `${listId}/${shareholderId}.${ext}`

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
