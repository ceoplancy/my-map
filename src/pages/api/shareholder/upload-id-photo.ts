import type { NextApiRequest, NextApiResponse } from "next"
import formidable, { type File as FormidableFile } from "formidable"

import fs from "fs/promises"
import { nanoid } from "nanoid"
import supabaseAdmin from "@/lib/supabase/supabaseAdminClient"
import * as Sentry from "@sentry/nextjs"

export const config = {
  api: {
    bodyParser: false,
  },
}

const BUCKET = "id-documents"
const MAX_BYTES = 6 * 1024 * 1024

function parseForm(
  req: NextApiRequest,
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_BYTES,
      allowEmptyFiles: false,
    })
    form.parse(req, (err, fields, files) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)))
      else resolve({ fields, files })
    })
  })
}

function firstField(v: string | string[] | undefined): string {
  if (v == null) return ""

  return Array.isArray(v) ? (v[0] ?? "") : v
}

function pickFirstFile(files: formidable.Files): FormidableFile | null {
  for (const v of Object.values(files)) {
    const arr = Array.isArray(v) ? v : v ? [v] : []
    for (const f of arr) {
      if (f && typeof (f as FormidableFile).filepath === "string") {
        return f as FormidableFile
      }
    }
  }

  return null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })

    return
  }

  try {
    const { fields, files } = await parseForm(req)

    const excelIdRaw = firstField(fields.excelId)
    const excelId = Number.parseInt(excelIdRaw, 10)
    if (!Number.isFinite(excelId) || excelId <= 0) {
      res.status(400).json({ error: "유효한 주주 번호가 아닙니다." })

      return
    }

    const uploaderName = firstField(fields.uploaderName).trim().slice(0, 200)
    const guideName = firstField(fields.guideName).trim().slice(0, 200)

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("excel")
      .select("id")
      .eq("id", excelId)
      .maybeSingle()

    if (fetchErr || !row) {
      res.status(404).json({ error: "해당 주주를 찾을 수 없습니다." })

      return
    }

    const file = pickFirstFile(files)
    if (!file) {
      res.status(400).json({ error: "이미지 파일을 선택해 주세요." })

      return
    }

    const mime = file.mimetype || "image/jpeg"
    if (
      !["image/jpeg", "image/png", "image/webp", "image/heic"].includes(mime)
    ) {
      res.status(400).json({
        error: "JPG, PNG, WebP, HEIC 이미지만 업로드할 수 있습니다.",
      })

      return
    }

    const ext =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/heic"
            ? "heic"
            : "jpg"

    const storagePath = `${excelId}/${Date.now()}-${nanoid(8)}.${ext}`

    let buffer: Buffer
    try {
      buffer = await fs.readFile(file.filepath)
    } finally {
      await fs.unlink(file.filepath).catch(() => {})
    }

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mime,
        upsert: false,
      })

    if (upErr) {
      Sentry.captureException(upErr)
      res.status(500).json({
        error:
          upErr.message ||
          "파일 저장에 실패했습니다. Storage 버킷(id-documents) 설정을 확인해 주세요.",
      })

      return
    }

    const { data: pub } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    const publicUrl = pub.publicUrl

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("shareholder_id_photo")
      .insert({
        excel_id: excelId,
        file_url: publicUrl,
        storage_path: storagePath,
        uploader_name: uploaderName || null,
        guide_name: guideName || null,
      })
      .select("id")
      .maybeSingle()

    if (insErr) {
      Sentry.captureException(insErr)
      res.status(500).json({
        error:
          insErr.message ||
          "기록 저장에 실패했습니다. shareholder_id_photo 테이블을 확인해 주세요.",
      })

      return
    }

    res.status(200).json({
      ok: true,
      fileUrl: publicUrl,
      recordId: inserted?.id ?? null,
    })
  } catch (e) {
    Sentry.captureException(e)
    const msg =
      e instanceof Error ? e.message : "업로드 처리 중 오류가 발생했습니다."
    res.status(500).json({ error: msg })
  }
}
