import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { withApiHandler } from "@/lib/withApiHandler"
import type { NextApiRequest, NextApiResponse } from "next"

const PUBLIC_PURPOSE = "public_drop"

type Body = {
  token?: string
  path?: string
  contentType?: string | null
  originalFilename?: string | null
}

/** 공개 접수 업로드 완료 후 메타데이터만 등록 (파일은 이미 signed URL로 업로드됨) */
export default withApiHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const body = req.body as Body
    const tokenStr = typeof body.token === "string" ? body.token.trim() : ""
    const path = typeof body.path === "string" ? body.path.trim() : ""
    if (!tokenStr || !path) {
      return res.status(400).json({ error: "token and path required" })
    }

    const admin = createSupabaseAdmin()
    const { data: tok, error: tokErr } = await admin
      .from("list_upload_tokens")
      .select("list_id, expires_at, purpose")
      .eq("token", tokenStr)
      .maybeSingle()
    if (tokErr || !tok) {
      return res.status(403).json({ error: "유효하지 않은 링크입니다." })
    }
    if (tok.purpose !== PUBLIC_PURPOSE) {
      return res.status(403).json({ error: "공개 접수 토큰이 아닙니다." })
    }
    if (new Date(tok.expires_at) < new Date()) {
      return res.status(403).json({ error: "만료된 링크입니다." })
    }

    const expectedPrefix = `inbox/${tok.list_id}/`
    if (!path.startsWith(expectedPrefix) || path.includes("..")) {
      return res.status(400).json({ error: "잘못된 경로입니다." })
    }

    const { error: insErr } = await admin.from("list_photo_dropbox").insert({
      list_id: tok.list_id,
      storage_path: path,
      content_type: body.contentType ?? null,
      original_filename: body.originalFilename ?? null,
    })
    if (insErr) {
      return res.status(500).json({ error: insErr.message })
    }

    return res.status(200).json({ success: true })
  },
)
