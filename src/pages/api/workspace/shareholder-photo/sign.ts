import { getAuthUserFromApiRequest } from "@/lib/api-auth"
import {
  assertShareholderBelongsToList,
  assertUserCanAccessShareholderList,
} from "@/lib/shareholderListAccess"
import { SHAREHOLDER_PHOTO_BUCKET } from "@/lib/shareholderPhotoStorage"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"
import { withApiHandler } from "@/lib/withApiHandler"
import type { NextApiRequest, NextApiResponse } from "next"

type Body = {
  listId?: string
  shareholderId?: string
  variant?: "id" | "proxy"

  /** 클라이언트 File.type — png 여부로 확장자 결정 */
  contentType?: string
}

/**
 * 신분증·의결권 사진 업로드용 서명 URL 발급.
 * 클라이언트가 Storage RLS로 400 나는 환경에서 서버(서비스 롤)가 서명만 만들고,
 * 브라우저는 `uploadToSignedUrl`로 직접 올립니다.
 */
export default withApiHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const auth = await getAuthUserFromApiRequest(req, res)
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const body = req.body as Body
    const listId = typeof body.listId === "string" ? body.listId : ""
    const shareholderId =
      typeof body.shareholderId === "string" ? body.shareholderId : ""
    const variant = body.variant === "proxy" ? "proxy" : "id"
    if (!listId || !shareholderId) {
      return res
        .status(400)
        .json({ error: "listId and shareholderId required" })
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
    const sh = await assertShareholderBelongsToList(
      client,
      listId,
      shareholderId,
    )
    if (!sh.ok) {
      return res.status(403).json({ error: sh.message })
    }

    const admin = createSupabaseAdmin()
    const ext =
      typeof body.contentType === "string" && body.contentType.includes("png")
        ? "png"
        : "webp"
    const suffix = variant === "proxy" ? "-proxy" : ""
    const path = `${listId}/${shareholderId}${suffix}.${ext}`

    const { data, error } = await admin.storage
      .from(SHAREHOLDER_PHOTO_BUCKET)
      .createSignedUploadUrl(path, { upsert: true })
    if (error || !data) {
      const raw = error?.message ?? ""
      const base = raw || "스토리지 서명 URL을 만들지 못했습니다."
      const hint = /related resource|not exist|not found|does not exist/i.test(
        raw,
      )
        ? " Storage에 버킷「shareholder-photos」가 있고 이름이 정확한지 확인하세요. 이미지 URL로 쓰려면 버킷을 Public으로 두는 것이 좋습니다."
        : ""

      return res.status(502).json({ error: `${base}${hint}` })
    }

    return res.status(200).json({
      bucket: SHAREHOLDER_PHOTO_BUCKET,
      path: data.path,
      token: data.token,
    })
  },
)
