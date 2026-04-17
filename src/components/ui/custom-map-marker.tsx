import { useGetFilterMenu } from "@/api/supabase"
import {
  prefetchShareholderChangeHistoryForMap,
  usePatchShareholder,
  useShareholderChangeHistoryForMap,
} from "@/api/workspace"
import { useSession } from "@/api/auth"
import { useCallback, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CustomOverlayMap, MapMarker } from "react-kakao-maps-sdk"
import styled from "@emotion/styled"
import { type MapMarkerData, isShareholderMarker } from "@/types/map"
import Modal from "./modal"
import MakerPatchModalChildren from "./modal-children/maker-patch-modal-children"
import MarkerDetailTable from "./marker-detail-table"
import GlobalSpinner from "./global-spinner"
import Portal from "./portal"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { toast } from "react-toastify"
import { ContentCopy, Edit, Close, Navigation } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"
import {
  getPrimaryStatusCategory,
  getShareholderStatusChipBackground,
  getShareholderStatusChipColor,
} from "@/lib/shareholderStatus"

export type { MapMarkerData } from "@/types/map"
const isShareholder = isShareholderMarker

const buildPinMarkerDataUrl = (fill: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36"><path fill="${fill}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0zm0 17c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/></svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const STATUS_MARKER_COLORS = {
  미방문: "#2868ED",
  보류: "#FFD939",
  완료: "#4DD664",
  실패: "#000000",
  전자투표: "#7C3AED",
  주주총회: "#0EA5E9",
} as const

// 상태 마커도 정적 파일 대신 코드 기반 SVG(data URL)로 생성
export const STATUS_MARKERS = {
  미방문: buildPinMarkerDataUrl(STATUS_MARKER_COLORS.미방문),
  보류: buildPinMarkerDataUrl(STATUS_MARKER_COLORS.보류),
  완료: buildPinMarkerDataUrl(STATUS_MARKER_COLORS.완료),
  실패: buildPinMarkerDataUrl(STATUS_MARKER_COLORS.실패),
} as const

// 회사 마커 색상 팔레트 (10가지) -> 동일한 핀 SVG에 fill만 적용
const COMPANY_MARKER_COLORS = [
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0D9488",
  "#2563EB",
  "#7C3AED",
  "#C026D3",
  "#DB2777",
  "#4B5563",
] as const

export const COMPANY_MARKERS = COMPANY_MARKER_COLORS.map((color) =>
  buildPinMarkerDataUrl(color),
)

export const getMarkerImage = (
  status: string | null,
  company: string | null,
  companyList: string[],
) => {
  const primaryStatus = getPrimaryStatusCategory(status)
  if (primaryStatus in STATUS_MARKERS && primaryStatus !== "미방문") {
    return STATUS_MARKERS[primaryStatus as keyof typeof STATUS_MARKERS]
  }

  if (company && companyList.length > 0) {
    const companyIndex = companyList.indexOf(company)
    if (companyIndex !== -1) {
      return COMPANY_MARKERS[companyIndex % COMPANY_MARKERS.length]
    }
  }

  return STATUS_MARKERS["미방문"]
}

/** 같은 좌표에 2개 이상 마커일 때, 모두 동일한 방문 상태면 클러스터 핀 색을 그 상태에 맞춤 */
const normalizeVisitStatus = (s: string | null | undefined): string => {
  return getPrimaryStatusCategory(s)
}

/** 클러스터 핀 채우기 — 상태별 마커와 동일 색상 계열 */
const GROUP_CLUSTER_FILL: Record<keyof typeof STATUS_MARKERS, string> = {
  미방문: STATUS_MARKER_COLORS.미방문,
  보류: STATUS_MARKER_COLORS.보류,
  완료: STATUS_MARKER_COLORS.완료,
  실패: STATUS_MARKER_COLORS.실패,
}

/** 같은 좌표에 보류·실패·완료 등 상태가 섞인 경우 — 단일 상태 색과 구분 */
const GROUP_CLUSTER_MIXED_FILL = "#7C3AED"

type GroupClusterVariant =
  | { kind: "uniform"; status: keyof typeof STATUS_MARKERS }
  | { kind: "mixed" }
  | { kind: "unknown_uniform" }

const resolveGroupClusterVariant = (
  groupMarkers: MapMarkerData[],
): GroupClusterVariant => {
  if (groupMarkers.length < 2) return { kind: "unknown_uniform" }
  const first = normalizeVisitStatus(groupMarkers[0].status)
  for (let i = 1; i < groupMarkers.length; i++) {
    if (normalizeVisitStatus(groupMarkers[i].status) !== first) {
      return { kind: "mixed" }
    }
  }
  if (first in STATUS_MARKERS) {
    return { kind: "uniform", status: first as keyof typeof STATUS_MARKERS }
  }

  return { kind: "unknown_uniform" }
}

const getGroupMarkerImage = (count: number, variant: GroupClusterVariant) => {
  let fill: string
  if (variant.kind === "uniform") {
    fill = GROUP_CLUSTER_FILL[variant.status]
  } else if (variant.kind === "mixed") {
    fill = GROUP_CLUSTER_MIXED_FILL
  } else {
    fill = GROUP_CLUSTER_FILL["미방문"]
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36"><path fill="${fill}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z"/><circle cx="12" cy="12" r="5.5" fill="white"/><text x="12" y="15" text-anchor="middle" font-size="9" font-weight="bold" fill="#1f2937" font-family="Arial,sans-serif">${count}</text></svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

interface CustomMapMarkerProps {
  marker: MapMarkerData
  markers?: MapMarkerData[]
  onMarkerSelect?: (_marker: MapMarkerData | null) => void
  initialInfoWindowOpen?: boolean
  forceKeepOpen?: boolean
}

interface MarkerStatusProps {
  status: string
}

interface MarkerItemProps {
  selected?: boolean
}

const CustomMapMarker = ({
  marker,
  markers,
  onMarkerSelect,
  initialInfoWindowOpen = false,
  forceKeepOpen = false,
}: CustomMapMarkerProps) => {
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { data: filterMenu } = useGetFilterMenu()
  const isGroupMarker = markers && markers.length > 1
  const groupClusterVariant =
    isGroupMarker && markers ? resolveGroupClusterVariant(markers) : null

  const [isOpen, setIsOpen] = useState(initialInfoWindowOpen)
  const [isMobileSheetCollapsed, setIsMobileSheetCollapsed] = useState(false)
  const [makerDataUpdateIsModalOpen, setMakerDataUpdateIsModalOpen] =
    useState(false)
  const [isMarkerSelectModalOpen, setIsMarkerSelectModalOpen] = useState(false)
  const [selectedGroupMarker, setSelectedGroupMarker] =
    useState<MapMarkerData | null>(null)
  const [patchModalSaveInProgress, setPatchModalSaveInProgress] =
    useState(false)

  const { mutate: patchShareholder, isPending: shareholderMutateLoading } =
    usePatchShareholder()
  const session = useSession().data
  const userId = session?.user?.id ?? ""

  const markerForDetail = isGroupMarker
    ? (selectedGroupMarker ?? marker)
    : marker
  const isShareholderMarker = isShareholder(markerForDetail)
  const makerDataMutateIsLoading = shareholderMutateLoading

  const shareholderIdForHistory = isShareholderMarker
    ? String(markerForDetail.id)
    : null
  const { data: mapHistory = [], isLoading: historyLoading } =
    useShareholderChangeHistoryForMap(shareholderIdForHistory, {
      enabled: isOpen,
    })

  const makerDataMutate = useCallback(
    (
      patchData: MapMarkerData,
      options?: {
        onSuccess?: () => void
        onError?: () => void
        onSettled?: () => void
      },
    ) => {
      if (!isShareholderMarker) return
      const patch: Partial<{ id: string; status: string; memo: string }> & {
        id: string
      } = {
        id: String((patchData as { id: string | number }).id),
      }
      const rawStatus = patchData.status ?? ""
      if (rawStatus !== "") {
        patch.status = rawStatus
      }
      patch.memo = patchData.memo ?? ""
      patchShareholder(
        {
          patch,
          userId,
        },
        {
          onSuccess: () => options?.onSuccess?.(),
          onError: () => options?.onError?.(),
          onSettled: () => options?.onSettled?.(),
        },
      )
    },
    [isShareholderMarker, patchShareholder, userId],
  )

  const handleAddressCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    navigator.clipboard.writeText(markerForDetail.address ?? "")
    toast.success("주소가 클립보드에 복사되었습니다")
  }

  const handleOpenDirections = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const lat = Number(markerForDetail.lat)
    const lng = Number(markerForDetail.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error("유효한 위치 정보가 없어 길찾기를 열 수 없습니다.")

      return
    }

    const destinationName = encodeURIComponent(
      markerForDetail.name ?? markerForDetail.company ?? "목적지",
    )
    const kakaoAppUrl = `kakaomap://route?ep=${lat},${lng}&by=CAR`
    const kakaoWebUrl = `https://map.kakao.com/link/to/${destinationName},${lat},${lng}`
    const isMobileClient = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (!isMobileClient) {
      window.open(kakaoWebUrl, "_blank", "noopener,noreferrer")

      return
    }

    const startedAt = Date.now()
    window.location.href = kakaoAppUrl
    window.setTimeout(() => {
      // 앱 전환이 되지 않으면 웹 지도로 폴백
      if (Date.now() - startedAt < 1700) {
        window.open(kakaoWebUrl, "_blank", "noopener,noreferrer")
      }
    }, 900)
  }

  const handleMarkerClick = () => {
    void prefetchShareholderChangeHistoryForMap(
      queryClient,
      isGroupMarker ? String(markerForDetail.id) : String(marker.id),
    )
    if (isGroupMarker) {
      if (isMobile) {
        setIsOpen(true)
        setIsMobileSheetCollapsed(false)
      } else {
        setIsMarkerSelectModalOpen(true)
      }
    } else if (!isOpen) {
      setIsOpen(true)
      setIsMobileSheetCollapsed(false)
    } else if (isMobileSheetCollapsed) {
      setIsMobileSheetCollapsed(false)
    }
  }

  const handleMarkerSelect = (selectedMarker: MapMarkerData) => {
    void prefetchShareholderChangeHistoryForMap(
      queryClient,
      String(selectedMarker.id),
    )
    setSelectedGroupMarker(selectedMarker)
    onMarkerSelect?.(selectedMarker)
    setIsMarkerSelectModalOpen(false)
  }

  useEffect(() => {
    setIsOpen(initialInfoWindowOpen)
  }, [initialInfoWindowOpen])

  useEffect(() => {
    if (forceKeepOpen) {
      setIsOpen(true)
    }
  }, [forceKeepOpen])

  useEffect(() => {
    if (!isMobile) return
    const onMapInteract = () => {
      if (isOpen) {
        setIsMobileSheetCollapsed(true)
      }
    }
    window.addEventListener("workspace-map-interact", onMapInteract)

    return () =>
      window.removeEventListener("workspace-map-interact", onMapInteract)
  }, [isMobile, isOpen])

  useEffect(() => {
    if (isGroupMarker && markerForDetail.id !== selectedGroupMarker?.id) {
      setSelectedGroupMarker(markerForDetail)
    }
  }, [isGroupMarker, markerForDetail, selectedGroupMarker?.id])

  if (!filterMenu) return null

  return (
    <Frame>
      {makerDataMutateIsLoading && (
        <SpinnerFrame>
          <GlobalSpinner
            width={18}
            height={18}
            marginRight={18}
            dotColor="#2561F4"
          />
        </SpinnerFrame>
      )}
      <MapMarker
        position={{
          lat: marker.lat || 0,
          lng: marker.lng || 0,
        }}
        clickable={true}
        onClick={handleMarkerClick}
        image={{
          src:
            isGroupMarker && groupClusterVariant
              ? getGroupMarkerImage(markers.length, groupClusterVariant)
              : getMarkerImage(
                  marker.status ?? "",
                  marker.company,
                  filterMenu.companyMenu,
                ),
          size: { width: 30, height: 40 },
        }}
      />
      {/* 인포윈도우(데스크톱) / 바텀 시트(모바일) */}
      {isOpen &&
        (isMobile ? (
          <Portal>
            <MobileSheet
              $collapsed={isMobileSheetCollapsed}
              onClick={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}>
              <MobileSheetHandleButton
                type="button"
                aria-label={
                  isMobileSheetCollapsed ? "시트 펼치기" : "시트 접기"
                }
                onClick={() =>
                  setIsMobileSheetCollapsed((prevCollapsed) => !prevCollapsed)
                }>
                <MobileSheetHandle />
              </MobileSheetHandleButton>
              {isMobileSheetCollapsed ? (
                <CollapsedSummary>
                  <CollapsedLineScroll>
                    <CollapsedNameStrong>
                      {markerForDetail.name ?? "주주"}
                    </CollapsedNameStrong>
                    <CollapsedSep aria-hidden>·</CollapsedSep>
                    <CollapsedMetaInline>
                      {markerForDetail.company ?? "회사 미지정"}
                    </CollapsedMetaInline>
                    <CollapsedSep aria-hidden>·</CollapsedSep>
                    <CollapsedMetaInline>
                      {`${Number(markerForDetail.stocks ?? 0).toLocaleString()}주`}
                    </CollapsedMetaInline>
                    <CollapsedSep aria-hidden>·</CollapsedSep>
                    <CollapsedStatusBadge
                      status={String(markerForDetail.status ?? "미방문")}>
                      {String(markerForDetail.status ?? "미방문")}
                    </CollapsedStatusBadge>
                  </CollapsedLineScroll>
                </CollapsedSummary>
              ) : (
                <>
                  <MobileSheetBody>
                    <MarkerSummary>
                      <SummaryName>{markerForDetail.name ?? "-"}</SummaryName>
                      <SummaryMetaRow>
                        <SummaryMetaText>
                          {markerForDetail.company ?? "-"}
                        </SummaryMetaText>
                        <SummaryMetaDot>·</SummaryMetaDot>
                        <SummaryMetaText>
                          {`${Number(markerForDetail.stocks ?? 0).toLocaleString()}주`}
                        </SummaryMetaText>
                        <SummaryMetaDot>·</SummaryMetaDot>
                        <SummaryStatus
                          status={String(markerForDetail.status ?? "미방문")}>
                          {String(markerForDetail.status ?? "미방문")}
                        </SummaryStatus>
                      </SummaryMetaRow>
                    </MarkerSummary>
                    {isGroupMarker && markers.length > 1 && (
                      <>
                        <MobileMarkerTabs>
                          {markers.map((m) => (
                            <MobileMarkerTab
                              key={m.id}
                              $selected={markerForDetail.id === m.id}
                              onClick={() => handleMarkerSelect(m)}>
                              {m.name ?? `주주 ${m.id}`}
                            </MobileMarkerTab>
                          ))}
                        </MobileMarkerTabs>
                      </>
                    )}
                    <MarkerDetailTable
                      data={markerForDetail}
                      history={isShareholderMarker ? mapHistory : undefined}
                      historyLoading={isShareholderMarker && historyLoading}
                      mobileScrollable={false}
                      hideShareholderId
                      hideSummaryFields
                      hideRowLabels
                    />
                  </MobileSheetBody>
                  <MobileSheetFooter>
                    <ActionButton
                      variant="success"
                      onClick={(e) => {
                        handleOpenDirections(e)
                      }}>
                      <Navigation fontSize="small" />
                      <span>길찾기</span>
                    </ActionButton>
                    <ActionButton
                      variant="primary"
                      onClick={(_e) => {
                        setMakerDataUpdateIsModalOpen(true)
                      }}>
                      <Edit fontSize="small" />
                      <span>수정하기</span>
                    </ActionButton>
                  </MobileSheetFooter>
                </>
              )}
            </MobileSheet>
          </Portal>
        ) : (
          <Portal>
            <CustomOverlayMap
              position={{
                lat: marker.lat || 0,
                lng: marker.lng || 0,
              }}
              clickable={true}
              yAnchor={1.1}
              zIndex={100}>
              <InfoWindowContainer
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="info-window-persistent">
                <InfoWindowHeader>
                  <CloseButton
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsOpen(false)
                    }}>
                    <Close fontSize="small" />
                  </CloseButton>
                </InfoWindowHeader>

                <MarkerSummary>
                  <SummaryName>{markerForDetail.name ?? "-"}</SummaryName>
                  <SummaryMetaRow>
                    <SummaryMetaText>
                      {markerForDetail.company ?? "-"}
                    </SummaryMetaText>
                    <SummaryMetaDot>·</SummaryMetaDot>
                    <SummaryMetaText>
                      {`${Number(markerForDetail.stocks ?? 0).toLocaleString()}주`}
                    </SummaryMetaText>
                    <SummaryMetaDot>·</SummaryMetaDot>
                    <SummaryStatus
                      status={String(markerForDetail.status ?? "미방문")}>
                      {String(markerForDetail.status ?? "미방문")}
                    </SummaryStatus>
                  </SummaryMetaRow>
                </MarkerSummary>

                <MarkerDetailTable
                  data={markerForDetail}
                  history={isShareholderMarker ? mapHistory : undefined}
                  historyLoading={isShareholderMarker && historyLoading}
                  hideShareholderId
                  hideSummaryFields
                  hideRowLabels
                />

                <InfoWindowFooter>
                  <ActionButton
                    variant="success"
                    onClick={(e) => {
                      handleAddressCopy(e)
                    }}>
                    <ContentCopy fontSize="small" />
                    <span>주소 복사</span>
                  </ActionButton>
                  <ActionButton
                    variant="primary"
                    onClick={(_e) => {
                      setMakerDataUpdateIsModalOpen(true)
                    }}>
                    <Edit fontSize="small" />
                    <span>수정하기</span>
                  </ActionButton>
                  <ActionButton
                    variant="close"
                    onClick={(_e) => {
                      setIsOpen(false)
                      onMarkerSelect?.(null)
                    }}>
                    <Close fontSize="small" />
                    <span>닫기</span>
                  </ActionButton>
                </InfoWindowFooter>
              </InfoWindowContainer>
            </CustomOverlayMap>
          </Portal>
        ))}
      {/* 마커 데이터 수정하기 모달 */}
      <Modal
        position="center"
        open={makerDataUpdateIsModalOpen}
        setOpen={(nextOpen) => {
          if (!nextOpen && patchModalSaveInProgress) return
          setMakerDataUpdateIsModalOpen(nextOpen)
        }}>
        <MakerPatchModalChildren
          makerData={isGroupMarker ? (selectedGroupMarker ?? marker) : marker}
          makerDataMutate={makerDataMutate}
          setMakerDataUpdateIsModalOpen={setMakerDataUpdateIsModalOpen}
          mutateIsPending={makerDataMutateIsLoading}
          onSavingChange={setPatchModalSaveInProgress}
          history={
            isShareholderMarker &&
            (!isGroupMarker || selectedGroupMarker?.id === marker.id)
              ? mapHistory
              : undefined
          }
        />
      </Modal>
      {/* 그룹 마커 선택 모달 */}
      {isGroupMarker && !isMobile && (
        <Modal
          open={isMarkerSelectModalOpen}
          setOpen={setIsMarkerSelectModalOpen}
          position="center">
          <MarkerSelectContainer>
            <ModalHeader>
              <HeaderTitle>주주 선택</HeaderTitle>
              <CloseButton onClick={() => setIsMarkerSelectModalOpen(false)}>
                <Close fontSize="small" />
              </CloseButton>
            </ModalHeader>
            <MarkerList>
              {markers.map((m) => (
                <MarkerItem
                  key={m.id}
                  onClick={() => handleMarkerSelect(m)}
                  selected={selectedGroupMarker?.id === m.id}>
                  <MarkerInfo>
                    <MarkerName>{m.name}</MarkerName>
                    <MarkerCompany>{m.company}</MarkerCompany>
                  </MarkerInfo>
                  <MarkerStatus status={m.status ?? ""}>
                    {m.status ?? ""}
                  </MarkerStatus>
                </MarkerItem>
              ))}
            </MarkerList>
          </MarkerSelectContainer>
        </Modal>
      )}
    </Frame>
  )
}

const Frame = styled.div`
  position: relative;
  z-index: 10;
`

const SpinnerFrame = styled.div`
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background-color: white;
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`

const InfoWindowContainer = styled.div`
  &.info-window-persistent {
    pointer-events: auto;
  }
  background-color: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 600px;
  max-height: 70vh;
  overflow-y: auto;

  @media (max-width: 1024px) {
    min-width: 400px;
    padding: 12px;
  }

  @media (max-width: 768px) {
    min-width: 300px;
    padding: 12px;
    max-height: 60vh;
  }

  @media (max-width: 480px) {
    min-width: 260px;
    padding: 12px;
  }
`

const MobileSheet = styled.div<{ $collapsed: boolean }>`
  position: fixed;
  left: max(0.5rem, env(safe-area-inset-left));
  right: max(0.5rem, env(safe-area-inset-right));
  bottom: max(0.5rem, env(safe-area-inset-bottom));
  z-index: 101;
  background: white;
  border-radius: 18px;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: ${(p) =>
    p.$collapsed
      ? "min(7.25rem, 36vh)"
      : "min(86vh, calc(100dvh - env(safe-area-inset-top) - 1rem))"};
  overflow: hidden;
  transition: max-height 0.24s ease;
`

const MobileSheetHandleButton = styled.button`
  border: none;
  background: transparent;
  padding: 0.625rem 0.75rem 0.25rem;
  min-height: 2rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
`

const MobileSheetHandle = styled.div`
  width: 3rem;
  height: 0.3rem;
  border-radius: 999px;
  background: ${COLORS.gray[300]};
  margin: 0 auto;
`

const MobileSheetBody = styled.div`
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 1rem 0.75rem;
  max-height: min(58vh, calc(100dvh - 15rem));
`

const CollapsedSummary = styled.div`
  padding: 0.1rem 1rem 0.85rem;
  min-width: 0;
`

/** 접힌 시트: 주주명 · 회사 · 주식수 · 상태를 한 줄(가로 스크롤)로 표시 */
const CollapsedLineScroll = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: nowrap;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  padding: 0.5rem 0.7rem;
  border-radius: 12px;
  background: ${COLORS.gray[50]};
  border: 1px solid ${COLORS.gray[200]};
  font-size: 0.875rem;
  line-height: 1.4;
  color: ${COLORS.gray[800]};
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: ${COLORS.gray[300]};
  }
`

const CollapsedNameStrong = styled.span`
  flex-shrink: 0;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  white-space: nowrap;
`

const CollapsedMetaInline = styled.span`
  flex-shrink: 0;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  white-space: nowrap;
`

const CollapsedSep = styled.span`
  flex-shrink: 0;
  color: ${COLORS.gray[400]};
  font-weight: 700;
`

const CollapsedStatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  min-height: 1.5rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  max-width: min(70vw, 16rem);
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${({ status }) => getShareholderStatusChipBackground(status)};
  color: ${({ status }) => getShareholderStatusChipColor(status)};
`

const MarkerSummary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.875rem 1rem;
  background: ${COLORS.gray[50]};
  border-radius: 12px;
`

const SummaryName = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SummaryMetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
`

const SummaryMetaText = styled.span`
  font-size: 0.875rem;
  color: ${COLORS.gray[700]};
  font-weight: 600;
`

const SummaryMetaDot = styled.span`
  color: ${COLORS.gray[400]};
  font-weight: 600;
`

const SummaryStatus = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
  background: ${({ status }) => getShareholderStatusChipBackground(status)};
  color: ${({ status }) => getShareholderStatusChipColor(status)};
`

const MobileMarkerTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
`

const MobileMarkerTab = styled.button<{ $selected: boolean }>`
  border-radius: 999px;
  border: 1px solid
    ${(p) => (p.$selected ? COLORS.blue[500] : COLORS.gray[300])};
  background: ${(p) => (p.$selected ? COLORS.blue[50] : "#fff")};
  color: ${(p) => (p.$selected ? COLORS.blue[700] : COLORS.gray[700])};
  padding: 0.5rem 0.85rem;
  white-space: nowrap;
  font-size: 0.8125rem;
  min-height: 2.25rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
`

const MobileSheetFooter = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  position: sticky;
  bottom: 0;
  margin-top: 0;
  padding: 0.875rem 1rem max(0.9rem, env(safe-area-inset-bottom));
  background: white;
  border-top: 1px solid ${COLORS.gray[200]};
`

const InfoWindowHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 8px;
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`

const InfoWindowFooter = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 6px;
  }
`

const ActionButton = styled.button<{
  variant: "success" | "primary" | "close"
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0.625rem 0.875rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  min-height: 2.75rem;
  flex: 1;

  background-color: ${({ variant }) =>
    variant === "success"
      ? `${COLORS.green[600]}`
      : variant === "primary"
        ? `${COLORS.blue[600]}`
        : `${COLORS.gray[500]}`};
  color: white;

  &:hover {
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    font-size: 13px;
    padding: 0.625rem 0.75rem;
  }
`

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #374151;
  }
`

const MarkerSelectContainer = styled.div`
  padding: 24px;
  min-width: 320px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: 16px;
    min-width: 260px;
  }
`

const MarkerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
`

const MarkerItem = styled.div<MarkerItemProps>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  background-color: ${({ selected }) =>
    selected ? "#2561F410" : "transparent"};
  border: 1px solid ${({ selected }) => (selected ? "#2561F4" : "#E5E7EB")};

  &:hover {
    background-color: ${({ selected }) => (selected ? "#2561F410" : "#F9FAFB")};
  }
`

const MarkerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const MarkerName = styled.span`
  font-weight: 600;
  font-size: 14px;
`

const MarkerCompany = styled.span`
  color: #6b7280;
  font-size: 12px;
`

const MarkerStatus = styled.span<MarkerStatusProps>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${({ status }) =>
    status === "완료"
      ? "#10B98120"
      : status === "진행중"
        ? "#F59E0B20"
        : "#F3F4F6"};
  color: ${({ status }) =>
    status === "완료"
      ? "#10B981"
      : status === "진행중"
        ? "#F59E0B"
        : "#374151"};
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`

export default CustomMapMarker
