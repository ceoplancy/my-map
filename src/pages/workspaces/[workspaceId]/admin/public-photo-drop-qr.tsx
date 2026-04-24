import { useRouter } from "next/router"
import { useRef, useState } from "react"
import styled from "@emotion/styled"
import { QrCode2 } from "@mui/icons-material"
import { QRCodeCanvas } from "qrcode.react"
import AdminLayout from "@/layouts/AdminLayout"
import { useGetUserData } from "@/api/auth"
import { useShareholderLists } from "@/api/workspace"
import { useWorkspaceAdminRoute } from "@/hooks/useWorkspaceAdminRoute"
import GlobalSpinner from "@/components/ui/global-spinner"
import { COLORS } from "@/styles/global-style"
import { reportError } from "@/lib/reportError"
import { toast } from "react-toastify"
import supabase from "@/lib/supabase/supabaseClient"
import { writePublicDropQrUrl } from "@/lib/publicDropQrStorage"

const SpinnerFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
`

const PageTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const Help = styled.p`
  font-size: 0.875rem;
  color: ${COLORS.gray[600]};
  margin: 0 0 1rem;
  line-height: 1.55;
`

const Row = styled.div`
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
`

const Btn = styled.button`
  padding: 0.5rem 1.1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  background: ${COLORS.purple[600]};
  color: white;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${COLORS.purple[700]};
  }
`

const BtnGhost = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  border: 1px solid ${COLORS.gray[300]};
  cursor: pointer;
  background: white;
  color: ${COLORS.gray[700]};
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const QrPanel = styled.div`
  margin-top: 1.25rem;
  padding: 1.5rem;
  border-radius: 1rem;
  border: 1px solid ${COLORS.gray[200]};
  background: ${COLORS.gray[50]};
  text-align: center;
  max-width: 28rem;
`

const UrlText = styled.p`
  font-size: 0.75rem;
  color: ${COLORS.gray[700]};
  word-break: break-all;
  margin: 0.75rem 0 0;
  text-align: left;
`

export default function PublicPhotoDropQrPage() {
  const router = useRouter()
  const { resolvedWorkspace, isReady } = useWorkspaceAdminRoute()
  const { data: user } = useGetUserData()
  const wsId = resolvedWorkspace?.id ?? null
  const { data: lists = [], isPending: listsLoading } =
    useShareholderLists(wsId)

  const [issuedUrl, setIssuedUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const qrWrapRef = useRef<HTMLDivElement>(null)

  const primaryListId = lists[0]?.id ?? ""

  const issueQr = async () => {
    if (!primaryListId) {
      toast.error("주주명부가 없어 링크를 만들 수 없습니다.")

      return
    }
    setBusy(true)
    try {
      const token = crypto.randomUUID().replace(/-/g, "")
      const expires_at = new Date(Date.now() + 7 * 86400000).toISOString()
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from("list_upload_tokens").insert({
        list_id: primaryListId,
        token,
        expires_at,
        created_by: auth.user?.id ?? null,
        purpose: "public_drop",
      })
      if (error) throw error
      const url = `${window.location.origin}/photo-drop?t=${token}`
      setIssuedUrl(url)
      if (wsId) writePublicDropQrUrl(wsId, url)
      await navigator.clipboard.writeText(url)
      toast.success("접수 링크를 클립보드에 복사했습니다. (7일 유효)")
    } catch (err) {
      reportError(err, { toastMessage: "링크 발급에 실패했습니다." })
    } finally {
      setBusy(false)
    }
  }

  const downloadQrPng = () => {
    const canvas = qrWrapRef.current?.querySelector("canvas")
    if (!canvas) {
      toast.error("QR 이미지를 찾을 수 없습니다.")

      return
    }
    try {
      const a = document.createElement("a")
      a.download = `public-photo-drop-qr-${wsId ?? "workspace"}.png`
      a.href = canvas.toDataURL("image/png")
      a.click()
      toast.success("PNG 파일을 저장했습니다.")
    } catch (e) {
      reportError(e, { toastMessage: "이미지 저장에 실패했습니다." })
    }
  }

  if (!isReady) {
    return (
      <AdminLayout>
        <SpinnerFrame>
          <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
        </SpinnerFrame>
      </AdminLayout>
    )
  }

  if (!resolvedWorkspace) {
    if (typeof window !== "undefined") router.replace("/workspaces")

    return null
  }

  if (!user?.user) return null

  return (
    <AdminLayout>
      <PageTitle>
        <QrCode2 aria-hidden />
        공개 사진 접수 QR
      </PageTitle>
      <Help>
        이 워크스페이스당 <strong>로그인 없이</strong> 사진만 받는 링크 하나를
        만듭니다(첫 번째 주주명부 기준). 아래 QR을 인쇄·저장해 현장에 붙여 쓸 수
        있습니다. 접수 내역은 지도 대시보드의 &quot;공개 접수함&quot;에서
        확인·다운로드할 수 있습니다.
      </Help>
      {listsLoading ? (
        <SpinnerFrame>
          <GlobalSpinner width={22} height={22} dotColor="#8536FF" />
        </SpinnerFrame>
      ) : lists.length === 0 ? (
        <p style={{ color: COLORS.gray[600] }}>주주명부가 없습니다.</p>
      ) : (
        <>
          <Row>
            <Btn type="button" disabled={busy} onClick={() => void issueQr()}>
              링크 발급 · QR 표시
            </Btn>
          </Row>
          {issuedUrl ? (
            <QrPanel>
              <div ref={qrWrapRef} style={{ display: "inline-block" }}>
                <QRCodeCanvas value={issuedUrl} size={280} level="M" />
              </div>
              <UrlText>{issuedUrl}</UrlText>
              <Row style={{ marginTop: "1rem", marginBottom: 0 }}>
                <BtnGhost
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(issuedUrl)}>
                  링크만 다시 복사
                </BtnGhost>
                <BtnGhost type="button" onClick={() => downloadQrPng()}>
                  QR PNG 저장
                </BtnGhost>
              </Row>
            </QrPanel>
          ) : null}
        </>
      )}
    </AdminLayout>
  )
}
