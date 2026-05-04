import { useEffect, useState, useCallback } from "react"
import styled from "@emotion/styled"

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>
}

function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false
  const nav = window.navigator as Navigator & { standalone?: boolean }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    nav.standalone === true
  )
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false

  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** (A): 안드로이드 단말(폰·태블릿)에서만 크롬/크로미움 계열 설치 프롬프트 허용 */
function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false

  return /android/i.test(navigator.userAgent)
}

/** (B): 안내 모달 노출 가능한 포터블 디바이스 (데스크톱 브라우저 제외) */
function isLikelyPortableDevice(): boolean {
  if (typeof window === "undefined") return false
  const ua = navigator.userAgent ?? ""
  const pointerCoarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  const small =
    typeof window.innerWidth === "number" && window.innerWidth <= 1024

  return (
    isIosDevice() ||
    pointerCoarse ||
    (/android|mobile|tablet|ipad|iphone/i.test(ua) && small)
  )
}

const Row = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
`

const ActionButton = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
`

const ChromiumInstallBtn = styled(ActionButton)`
  border: 1px solid #1557b0;
  background: #e8f0fe;
  color: #1a73e8;

  &:hover {
    background: #d7e8fc;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const HelpOutlineBtn = styled(ActionButton)`
  border: 1px solid #e0e0e0;
  background: white;
  color: #444;

  &:hover {
    border-color: #c5c5c5;
    background: #fafafa;
  }
`

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));

  @media (min-width: 480px) {
    align-items: center;
    padding: 1.5rem;
  }
`

const ModalSheet = styled.div`
  background: white;
  width: min(440px, 100%);
  max-height: min(85vh, 520px);
  overflow-y: auto;
  border-radius: 12px;
  padding: 1.25rem 1.35rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

  @media (max-width: 479px) {
    border-radius: 12px 12px 8px 8px;
  }
`

const ModalTitle = styled.h2`
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
`

const ModalList = styled.ol`
  margin: 0;
  padding-left: 1.15rem;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.55;

  li {
    margin-bottom: 0.5rem;
  }
`

const ModalHint = styled.p`
  margin: 0.85rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.45;
`

const ModalCloseBtn = styled.button`
  margin-top: 1.1rem;
  width: 100%;
  padding: 0.65rem;
  border: none;
  border-radius: 8px;
  background: #1a73e8;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;

  &:hover {
    background: #1557b0;
  }
`

/** 로그인·랜딩 등: (A) 안드로이드 크롬류 설치, (B) iOS·기타 휴대 환경 안내 */
export default function PwaInstallActions() {
  const [mounted, setMounted] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(
    null,
  )
  const [promptBusy, setPromptBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    setStandalone(getIsStandalone())

    const handler = (e: Event) => {
      ;(e as BeforeInstallPromptEventLike).preventDefault?.()
      setDeferred(e as BeforeInstallPromptEventLike)
    }
    window.addEventListener("beforeinstallprompt", handler)

    const onStandaloneChange = () => setStandalone(getIsStandalone())
    window
      .matchMedia("(display-mode: standalone)")
      .addEventListener("change", onStandaloneChange)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window
        .matchMedia("(display-mode: standalone)")
        .removeEventListener("change", onStandaloneChange)
    }
  }, [])

  const handleChromiumInstall = useCallback(async () => {
    if (!deferred) return
    setPromptBusy(true)
    try {
      await deferred.prompt()
      if (deferred.userChoice) await deferred.userChoice
    } catch {
      // 사용자 취소 등 무시
    } finally {
      setDeferred(null)
      setPromptBusy(false)
    }
  }, [deferred])

  if (!mounted || standalone) return null

  const ios = isIosDevice()
  const showInstallChromium =
    Boolean(deferred) && isAndroidDevice() && !standalone
  const showHelp =
    (ios || (!showInstallChromium && isLikelyPortableDevice())) && !standalone

  let helpSubtitle = ""
  if (ios) helpSubtitle = "추가한 아이콘을 누르면 이 사이트로 바로 돌아옵니다."
  else if (isAndroidDevice())
    helpSubtitle =
      "이 브라우저는 설치 프롬프트를 지원하지 않을 수 있습니다. 메뉴에서 홈 화면 추가를 찾아 주세요."
  else
    helpSubtitle =
      "브라우저마다 메뉴 이름이 조금 다를 수 있습니다(예: 앱 설치, 바로가기 추가)."

  if (!showInstallChromium && !showHelp) return null

  return (
    <>
      <Row aria-label="홈 화면 바로가기">
        {showInstallChromium && (
          <ChromiumInstallBtn
            type="button"
            onClick={() => void handleChromiumInstall()}
            disabled={promptBusy}>
            {promptBusy ? "처리 중…" : "홈 화면에 추가 (앱처럼 설치)"}
          </ChromiumInstallBtn>
        )}
        {showHelp && (
          <HelpOutlineBtn type="button" onClick={() => setModalOpen(true)}>
            홈 화면 추가 방법 보기
          </HelpOutlineBtn>
        )}
      </Row>

      {modalOpen && (
        <ModalOverlay
          role="presentation"
          onClick={() => setModalOpen(false)}
          onKeyDown={(ev) => {
            if (ev.key === "Escape") setModalOpen(false)
          }}>
          <ModalSheet
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-help-title"
            onClick={(e) => e.stopPropagation()}>
            <ModalTitle id="pwa-help-title">
              홈 화면에 아이콘 추가하기
            </ModalTitle>

            {ios ? (
              <>
                <ModalList>
                  <li>
                    브라우저 하단(또는 주소 표시줄 근처)의 <strong>공유</strong>{" "}
                    아이콘을 탭합니다.
                  </li>
                  <li>
                    아래로 스크롤해 <strong>홈 화면에 추가</strong>를
                    선택합니다.
                  </li>
                  <li>
                    이름을 확인한 뒤 오른쪽 위 <strong>추가</strong>를 누릅니다.
                  </li>
                </ModalList>
                <ModalHint>{helpSubtitle}</ModalHint>
              </>
            ) : (
              <>
                <ModalList>
                  <li>브라우저 메뉴(점 세 개 ⋮ 또는 More)를 엽니다.</li>
                  <li>
                    <strong>홈 화면에 추가</strong> 또는{" "}
                    <strong>앱 설치 / 설치</strong> 같은 항목을 선택합니다.
                  </li>
                  <li>확인을 누르면 홈 화면에 아이콘이 생깁니다.</li>
                </ModalList>
                <ModalHint>{helpSubtitle}</ModalHint>
              </>
            )}
            <ModalCloseBtn type="button" onClick={() => setModalOpen(false)}>
              확인
            </ModalCloseBtn>
          </ModalSheet>
        </ModalOverlay>
      )}
    </>
  )
}
