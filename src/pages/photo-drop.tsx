import { useRouter } from "next/router"
import { useRef, useState } from "react"
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

const NameLabel = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${COLORS.gray[800]};
  margin-bottom: 0.35rem;
`

const NameInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 10px 12px;
  margin-bottom: 1rem;
  font-size: 1rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 10px;
  background: white;
  &::placeholder {
    color: ${COLORS.gray[400]};
  }
  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px ${COLORS.blue[100]};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const FileRow = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const FilePickButton = styled.button`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${COLORS.blue[700]};
  background: ${COLORS.blue[50]};
  border: 1px solid ${COLORS.blue[200]};
  border-radius: 10px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

export default function PhotoDropPage() {
  const router = useRouter()
  const t = router.query.t
  const tokenStr = typeof t === "string" ? t : ""
  const [busy, setBusy] = useState(false)
  const [submitterName, setSubmitterName] = useState("")
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File) => {
    if (!tokenStr) {
      toast.error("링크에 토큰이 없습니다.")

      return
    }
    const nameTrim = submitterName.trim()
    if (!nameTrim) {
      toast.error("이름을 입력해 주세요.")

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

      const displayName = file.name?.trim()
        ? `${nameTrim} · ${file.name.trim()}`
        : nameTrim

      const regRes = await fetch("/api/public/photo-drop/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenStr,
          path: signed.path,
          contentType: file.type || null,
          originalFilename: displayName,
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
      <NameLabel htmlFor="photo-drop-name">이름</NameLabel>
      <NameInput
        id="photo-drop-name"
        name="submitterName"
        type="text"
        autoComplete="name"
        enterKeyHint="done"
        placeholder="이름을 입력해 주세요"
        value={submitterName}
        disabled={busy}
        onChange={(e) => setSubmitterName(e.target.value)}
      />
      <FileRow>
        <FilePickButton
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={() => galleryInputRef.current?.click()}>
          {busy ? "업로드 중…" : "앨범·파일에서 선택"}
        </FilePickButton>
        <FilePickButton
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={() => cameraInputRef.current?.click()}>
          {busy ? "업로드 중…" : "카메라로 촬영"}
        </FilePickButton>
        <HiddenFileInput
          ref={galleryInputRef}
          disabled={busy}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (f) void onFile(f)
          }}
        />
        <HiddenFileInput
          ref={cameraInputRef}
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
      </FileRow>
      {busy ? (
        <div style={{ marginTop: "1rem" }}>
          <GlobalSpinner width={22} height={22} dotColor="#8536FF" />
        </div>
      ) : null}
    </Page>
  )
}
