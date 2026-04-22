import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { withApiHandler } from "@/lib/withApiHandler"
import type { NextApiRequest, NextApiResponse } from "next"

/**
 * 링크의 `token`으로 `list_upload_tokens` 한 건만 조회 (서비스 롤).
 * RLS로 테이블 직접 SELECT가 막힌 뒤에도 /upload-photo 등에서 사용합니다.
 */
export default withApiHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const raw = req.query.token
    const tokenStr = typeof raw === "string" ? raw.trim() : ""
    if (!tokenStr) {
      return res.status(400).json({ error: "token required" })
    }

    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from("list_upload_tokens")
      .select("*")
      .eq("token", tokenStr)
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: error.message })
    }
    if (!data) {
      return res.status(404).json({ error: "유효하지 않은 링크입니다." })
    }
    if (new Date(data.expires_at) < new Date()) {
      return res.status(403).json({ error: "만료된 링크입니다." })
    }

    return res.status(200).json(data)
  },
)
