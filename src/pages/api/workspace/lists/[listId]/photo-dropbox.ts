import { getAuthUserFromApiRequest } from "@/lib/api-auth"
import { assertUserCanAccessShareholderList } from "@/lib/shareholderListAccess"
import { SHAREHOLDER_PHOTO_BUCKET } from "@/lib/shareholderPhotoStorage"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"
import { withApiHandler } from "@/lib/withApiHandler"
import type { NextApiRequest, NextApiResponse } from "next"

const SIGNED_TTL_SEC = 60 * 60

/**
 * 공개 접수함 파일 목록 + 다운로드용 서명 URL (로그인·명부 접근 권한 필요).
 */
export default withApiHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const listId = req.query.listId
    if (typeof listId !== "string") {
      return res.status(400).json({ error: "listId required" })
    }

    const auth = await getAuthUserFromApiRequest(req, res)
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const client = createSupabaseWithToken(auth.token)
    const gate = await assertUserCanAccessShareholderList(
      client,
      auth.user.id,
      listId,
    )
    if (!gate.ok) {
      return res.status(403).json({ error: gate.message })
    }

    const admin = createSupabaseAdmin()
    const { data: rows, error } = await admin
      .from("list_photo_dropbox")
      .select("id, storage_path, created_at, content_type, original_filename")
      .eq("list_id", listId)
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    const items = []
    for (const r of rows ?? []) {
      const p = r.storage_path
      if (!p || !p.startsWith(`inbox/${listId}/`)) continue
      const { data: signed, error: sErr } = await admin.storage
        .from(SHAREHOLDER_PHOTO_BUCKET)
        .createSignedUrl(p, SIGNED_TTL_SEC)
      if (sErr || !signed?.signedUrl) continue
      items.push({
        id: r.id,
        path: p,
        created_at: r.created_at,
        content_type: r.content_type,
        original_filename: r.original_filename,
        downloadUrl: signed.signedUrl,
      })
    }

    return res.status(200).json({ items })
  },
)
