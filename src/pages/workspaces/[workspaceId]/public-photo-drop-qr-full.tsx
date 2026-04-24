import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import styled from "@emotion/styled"
import { QRCodeCanvas } from "qrcode.react"

import { useAuth, useMyWorkspaces } from "@/api/auth"
import { useCurrentWorkspace } from "@/store/workspaceState"
import { COLORS } from "@/styles/global-style"
import { ROUTES } from "@/constants/routes"
import GlobalSpinner from "@/components/ui/global-spinner"
import { readPublicDropQrUrl } from "@/lib/publicDropQrStorage"
import FieldAgentAgreementGate from "@/components/workspace/FieldAgentAgreementGate"

const Page = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  box-sizing: border-box;
  padding: max(0.75rem, env(safe-area-inset-top))
    max(0.75rem, env(safe-area-inset-right))
    max(1rem, env(safe-area-inset-bottom))
    max(0.75rem, env(safe-area-inset-left));
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
`

const TopBar = styled.div`
  width: 100%;
  max-width: 28rem;
  display: flex;
  justify-content: flex-end;
`

const CloseBtn = styled.button`
  min-height: 44px;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid ${COLORS.gray[300]};
  background: white;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${COLORS.gray[800]};
  cursor: pointer;
  touch-action: manipulation;
`

const QrWrap = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  width: 100%;
`

const EmptyBox = styled.div`
  max-width: 22rem;
  text-align: center;
  font-size: 0.9375rem;
  color: ${COLORS.gray[600]};
  line-height: 1.55;
  a {
    color: ${COLORS.blue[600]};
    font-weight: 600;
  }
`

export default function PublicPhotoDropQrFullPage() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId?: string }
  const { user, session, isLoading: authLoading } = useAuth()
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()
  const [, setCurrentWorkspace] = useCurrentWorkspace()
  const [qrSize, setQrSize] = useState(280)

  const resolvedWorkspace =
    workspaceId && Array.isArray(workspaces)
      ? (workspaces.find((w) => w.id === workspaceId) ?? null)
      : null

  useEffect(() => {
    if (!router.isReady || !workspaceId) return
    if (workspacesLoading) return
    if (!resolvedWorkspace) {
      if (authLoading) return
      if (!session) {
        void router.replace(ROUTES.signIn)

        return
      }
      void router.replace(ROUTES.workspaces)

      return
    }
    setCurrentWorkspace(resolvedWorkspace)
  }, [
    router.isReady,
    workspaceId,
    workspacesLoading,
    resolvedWorkspace,
    setCurrentWorkspace,
    router,
    authLoading,
    session,
  ])

  const issuedUrl = useMemo(() => {
    if (!workspaceId || typeof workspaceId !== "string") return null

    return readPublicDropQrUrl(workspaceId)
  }, [workspaceId])

  useEffect(() => {
    const apply = () => {
      const s = Math.min(
        360,
        Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.72),
      )
      setQrSize(Math.max(200, s))
    }
    apply()
    window.addEventListener("resize", apply)

    return () => window.removeEventListener("resize", apply)
  }, [])

  useEffect(() => {
    if (authLoading || session) return
    void router.replace(ROUTES.signIn)
  }, [authLoading, router, session])

  const resolving =
    !router.isReady ||
    !workspaceId ||
    workspacesLoading ||
    (workspaceId && !resolvedWorkspace)

  if (resolving) {
    return (
      <Page>
        <GlobalSpinner width={26} height={26} dotColor="#8536FF" />
      </Page>
    )
  }

  const ws = typeof workspaceId === "string" ? workspaceId : ""
  const adminQrHref = `/workspaces/${ws}/admin/public-photo-drop-qr`

  return (
    <Page>
      <FieldAgentAgreementGate workspaceId={ws || null} />
      <TopBar>
        <CloseBtn
          type="button"
          onClick={() => {
            if (ws) void router.push(`/workspaces/${ws}`)
          }}>
          닫기
        </CloseBtn>
      </TopBar>
      <QrWrap>
        {issuedUrl ? (
          <QRCodeCanvas
            value={issuedUrl}
            size={qrSize}
            level="M"
            includeMargin
          />
        ) : (
          <EmptyBox>
            <p style={{ margin: "0 0 0.75rem" }}>
              아직 이 워크스페이스에 저장된 공개 접수 QR이 없습니다.
              워크스페이스 관리 화면에서 링크를 발급하면 여기에 표시됩니다.
            </p>
            {user ? (
              <a href={adminQrHref}>공개 사진 접수 QR 발급 화면으로 이동</a>
            ) : null}
          </EmptyBox>
        )}
      </QrWrap>
    </Page>
  )
}
