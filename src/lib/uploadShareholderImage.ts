import supabase from "@/lib/supabase/supabaseClient"

const MAX_BYTES = 5 * 1024 * 1024

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

function bucketName(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_SHAREHOLDER_BUCKET?.trim() ||
    "shareholder-images"
  )
}

/**
 * Supabase Storage 공개 버킷에 업로드 후 public URL 반환.
 * 대시보드에서 버킷 생성·정책 적용 필요 (scripts/setup_shareholder_storage.sql 참고).
 */
export async function uploadShareholderImageFile(
  shareholderId: string | number,
  file: File,
): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("JPG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.")
  }
  if (file.size > MAX_BYTES) {
    throw new Error("파일 크기는 5MB 이하여야 합니다.")
  }

  const bucket = bucketName()
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg"
  const path = `${String(shareholderId)}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  })

  if (error) {
    throw new Error(
      error.message ||
        "업로드에 실패했습니다. Storage 버킷·권한을 확인해 주세요.",
    )
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  return data.publicUrl
}
