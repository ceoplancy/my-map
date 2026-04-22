import { useRouter } from "next/router"
import { useState } from "react"
import styled from "@emotion/styled"
import { toast } from "react-toastify"

import GlobalSpinner from "@/components/ui/global-spinner"
import { COLORS } from "@/styles/global-style"
import { reportError } from "@/lib/reportError"
import supabase from "@/lib/supabase/supabaseClient"

const Page = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  box-sizing: border-box;
  padding: max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    max(1.25rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  max-width: 28rem;
  margin: 0 auto;
  background: ${COLORS.background.light};
`

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  margin-bottom: 0.75rem;
`

const FileInput = styled.input`
  width: 100%;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
`

export default function PhotoDropPage() {
  const router = useRouter()
  const t = router.query.t
  const tokenStr = typeof t === "string" ? t : ""
  const [busy, setBusy] = useState(false)

  const onFile = async (file: File) => {
    if (!tokenStr) {
      toast.error("링크에 토큰이 없습니다.")

      return
    }
    setBusy(true)
    try {
      const signRes = await fetch("/api/public/photo-drop/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenStr,
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

      const { error: upErr } = await supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type || undefined,
        })
      if (upErr) throw upErr

      const regRes = await fetch("/api/public/photo-drop/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenStr,
          path: signed.path,
          contentType: file.type || null,
          originalFilename: file.name || null,
        }),
      })
      if (!regRes.ok) {
        let msg = regRes.statusText
        try {
          const j = (await regRes.json()) as { error?: string }
          if (j.error) msg = j.error
        } catch {
          void 0
        }
        throw new Error(msg)
      }

      toast.success("사진이 접수되었습니다. 감사합니다.")
    } catch (e) {
      reportError(e, { toastMessage: "업로드에 실패했습니다." })
    } finally {
      setBusy(false)
    }
  }

  if (!router.isReady) {
    return (
      <Page>
        <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
      </Page>
    )
  }

  if (!tokenStr) {
    return (
      <Page>
        <Title>링크 오류</Title>
        <p style={{ color: COLORS.gray[600] }}>
          올바른 접수 링크로 다시 열어 주세요.
        </p>
      </Page>
    )
  }

  return (
    <Page>
      <Title>사진 접수</Title>
      <p style={{ color: COLORS.gray[600], fontSize: "0.875rem" }}>
        로그인 없이 사진 한 장을 올릴 수 있습니다. 촬영 또는 앨범에서 선택해
        주세요.
      </p>
      <FileInput
        disabled={busy}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) void onFile(f)
        }}
      />
      {busy ? (
        <div style={{ marginTop: "1rem" }}>
          <GlobalSpinner width={22} height={22} dotColor="#8536FF" />
        </div>
      ) : null}
    </Page>
  )
}
