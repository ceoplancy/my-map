import { SHAREHOLDER_PHOTO_BUCKET } from "@/lib/shareholderPhotoStorage"
import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { withApiHandler } from "@/lib/withApiHandler"
import { randomUUID } from "crypto"
import type { NextApiRequest, NextApiResponse } from "next"

const PUBLIC_PURPOSE = "public_drop"

type Body = {
  token?: string
  contentType?: string
}

/**
 * 비로그인 공개 접수용 업로드 서명 URL.
 * `list_upload_tokens.purpose = public_drop` 이고 만료 전인 토큰만 허용.
 */
export default withApiHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const body = req.body as Body
    const tokenStr = typeof body.token === "string" ? body.token.trim() : ""
    if (!tokenStr) {
      return res.status(400).json({ error: "token required" })
    }

    const admin = createSupabaseAdmin()
    const { data: tok, error: tokErr } = await admin
      .from("list_upload_tokens")
      .select("id, list_id, expires_at, purpose")
      .eq("token", tokenStr)
      .maybeSingle()

    if (tokErr || !tok) {
      return res.status(403).json({ error: "유효하지 않은 링크입니다." })
    }
    if (tok.purpose !== PUBLIC_PURPOSE) {
      return res.status(403).json({
        error:
          "이 링크는 공개 접수용이 아닙니다. 관리자에게 공개 접수 링크를 요청해 주세요.",
      })
    }
    if (new Date(tok.expires_at) < new Date()) {
      return res.status(403).json({ error: "만료된 링크입니다." })
    }

    const ext =
      typeof body.contentType === "string" && body.contentType.includes("png")
        ? "png"
        : "webp"
    const path = `inbox/${tok.list_id}/${randomUUID()}.${ext}`

    const { data, error } = await admin.storage
      .from(SHAREHOLDER_PHOTO_BUCKET)
      .createSignedUploadUrl(path, { upsert: false })
    if (error || !data) {
      return res.status(502).json({
        error: error?.message ?? "스토리지 서명 URL을 만들지 못했습니다.",
      })
    }

    return res.status(200).json({
      bucket: SHAREHOLDER_PHOTO_BUCKET,
      path: data.path,
      token: data.token,
      listId: tok.list_id,
    })
  },
)
