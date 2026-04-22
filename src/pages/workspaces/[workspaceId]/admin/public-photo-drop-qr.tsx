import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import styled from "@emotion/styled"
import { QrCode2 } from "@mui/icons-material"
import { QRCodeSVG } from "qrcode.react"
import AdminLayout from "@/layouts/AdminLayout"
import { useGetUserData } from "@/api/auth"
import { useShareholderLists } from "@/api/workspace"
import { useWorkspaceAdminRoute } from "@/hooks/useWorkspaceAdminRoute"
import GlobalSpinner from "@/components/ui/global-spinner"
import { COLORS } from "@/styles/global-style"
import { reportError } from "@/lib/reportError"
import { toast } from "react-toastify"
import supabase from "@/lib/supabase/supabaseClient"

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

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${COLORS.gray[700]};
`

const Select = styled.select`
  padding: 0.45rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid ${COLORS.gray[200]};
  font-size: 0.875rem;
  min-width: 12rem;
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

  const [listId, setListId] = useState("")
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (lists.length > 0 && !listId) {
      setListId(lists[0].id)
    }
  }, [lists, listId])

  const issueQr = async () => {
    if (!listId) {
      toast.error("명부를 선택해 주세요.")

      return
    }
    setBusy(true)
    try {
      const token = crypto.randomUUID().replace(/-/g, "")
      const expires_at = new Date(Date.now() + 7 * 86400000).toISOString()
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from("list_upload_tokens").insert({
        list_id: listId,
        token,
        expires_at,
        created_by: auth.user?.id ?? null,
        purpose: "public_drop",
      })
      if (error) throw error
      const url = `${window.location.origin}/photo-drop?t=${token}`
      setIssuedUrl(url)
      await navigator.clipboard.writeText(url)
      toast.success("접수 링크를 클립보드에 복사했습니다. (7일 유효)")
    } catch (err) {
      reportError(err, { toastMessage: "링크 발급에 실패했습니다." })
    } finally {
      setBusy(false)
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
        선택한 주주명부용 <strong>로그인 없이</strong> 사진만 받는 링크를
        만들고, 아래 QR을 인쇄·캡처해 현장에 붙여 쓸 수 있습니다. 접수 내역은
        지도 메뉴의 &quot;공개 접수함&quot;에서 내려받을 수 있습니다.
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
            <Label htmlFor="qr-list">명부</Label>
            <Select
              id="qr-list"
              value={listId}
              onChange={(e) => {
                setListId(e.target.value)
                setIssuedUrl(null)
              }}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Btn type="button" disabled={busy} onClick={() => void issueQr()}>
              링크 발급 · QR 표시
            </Btn>
          </Row>
          {issuedUrl ? (
            <QrPanel>
              <div style={{ display: "inline-block" }}>
                <QRCodeSVG value={issuedUrl} size={280} level="M" />
              </div>
              <UrlText>{issuedUrl}</UrlText>
              <Row style={{ marginTop: "1rem", marginBottom: 0 }}>
                <BtnGhost
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(issuedUrl)}>
                  링크만 다시 복사
                </BtnGhost>
              </Row>
            </QrPanel>
          ) : null}
        </>
      )}
    </AdminLayout>
  )
}
