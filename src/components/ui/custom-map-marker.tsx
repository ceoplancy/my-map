import { useGetFilterMenu, usePatchExcel } from "@/api/supabase"
import {
  usePatchShareholder,
  useShareholderChangeHistoryForMap,
} from "@/api/workspace"
import { useSession } from "@/api/auth"
import { useCallback, useEffect, useState } from "react"
import { CustomOverlayMap, MapMarker } from "react-kakao-maps-sdk"
import styled from "@emotion/styled"
import { Excel } from "@/types/excel"
import { type MapMarkerData, isShareholderMarker } from "@/types/map"
import Modal from "./modal"
import MakerPatchModalChildren from "./modal-children/maker-patch-modal-children"
import ExcelDataTable from "./excel-data-table"
import GlobalSpinner from "./global-spinner"
import Portal from "./portal"
import { toast } from "react-toastify"
import { ContentCopy, Edit, Close } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"

export type { MapMarkerData } from "@/types/map"
const isShareholder = isShareholderMarker

// 기본(미방문) 마커: #2868ED + 흰색 테두리(겹침/검은색 방지). SVG 내부는 # 사용 후 encodeURIComponent로 인코딩.
const DEFAULT_MARKER_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36"><path fill="#2868ED" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0zm0 17c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/></svg>',
)}`

// status에 따른 마커 색상
export const STATUS_MARKERS = {
  미방문: DEFAULT_MARKER_SVG,
  보류: "/svg/pending.svg",
  완료: "/svg/complete.svg",
  실패: "/svg/fail.svg",
} as const

// 회사별 마커 색상 (10가지)
export const COMPANY_MARKERS = [
  "/svg/maker1.svg",
  "/svg/maker2.svg",
  "/svg/maker3.svg",
  "/svg/maker4.svg",
  "/svg/maker5.svg",
  "/svg/maker6.svg",
  "/svg/maker7.svg",
  "/svg/maker8.svg",
  "/svg/maker9.svg",
  "/svg/maker10.svg",
] as const

export const getMarkerImage = (
  status: string | null,
  company: string | null,
  companyList: string[],
) => {
  if (status && status !== "미방문" && status in STATUS_MARKERS) {
    return STATUS_MARKERS[status as keyof typeof STATUS_MARKERS]
  }

  if (company && companyList.length > 0) {
    const companyIndex = companyList.indexOf(company)
    if (companyIndex !== -1) {
      return COMPANY_MARKERS[companyIndex % COMPANY_MARKERS.length]
    }
  }

  return STATUS_MARKERS["미방문"]
}

const getGroupMarkerImage = (count: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36"><path fill="#2868ED" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z"/><circle cx="12" cy="12" r="5.5" fill="white"/><text x="12" y="15" text-anchor="middle" font-size="9" font-weight="bold" fill="#1f2937" font-family="Arial,sans-serif">${count}</text></svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

interface CustomMapMarkerProps {
  marker: MapMarkerData
  markers?: MapMarkerData[]
  onMarkerSelect?: (_marker: MapMarkerData | null) => void
  initialInfoWindowOpen?: boolean
  forceKeepOpen?: boolean

  /** 워크스페이스 지도 등: 항상 shareholder API만 사용 (excel 패치 호출 안 함) */
  useShareholderPatchOnly?: boolean
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
  useShareholderPatchOnly = false,
}: CustomMapMarkerProps) => {
  const { data: filterMenu } = useGetFilterMenu()
  const isGroupMarker = markers && markers.length > 1

  const [isOpen, setIsOpen] = useState(initialInfoWindowOpen)
  const [makerDataUpdateIsModalOpen, setMakerDataUpdateIsModalOpen] =
    useState(false)
  const [isMarkerSelectModalOpen, setIsMarkerSelectModalOpen] = useState(false)
  const [selectedGroupMarker, setSelectedGroupMarker] =
    useState<MapMarkerData | null>(null)
  const [patchModalSaveInProgress, setPatchModalSaveInProgress] =
    useState(false)

  const { mutate: patchExcel, isPending: excelMutateLoading } = usePatchExcel()
  const { mutate: patchShareholder, isPending: shareholderMutateLoading } =
    usePatchShareholder()
  const session = useSession().data
  const userId = session?.user?.id ?? ""

  const isShareholderMarker = useShareholderPatchOnly || isShareholder(marker)
  const makerDataMutateIsLoading = isShareholderMarker
    ? shareholderMutateLoading
    : excelMutateLoading

  const shareholderIdForHistory = isShareholderMarker ? String(marker.id) : null
  const { data: mapHistory = [] } = useShareholderChangeHistoryForMap(
    shareholderIdForHistory,
    { enabled: isOpen },
  )

  const makerDataMutate = useCallback(
    (
      patchData: MapMarkerData | Excel,
      options?: {
        onSuccess?: () => void
        onError?: () => void
        onSettled?: () => void
      },
    ) => {
      if (isShareholderMarker) {
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
            accessToken: session?.access_token ?? null,
          },
          {
            onSuccess: () => options?.onSuccess?.(),
            onError: () => options?.onError?.(),
            onSettled: () => options?.onSettled?.(),
          },
        )
      } else {
        patchExcel(patchData as Excel, options)
      }
    },
    [
      isShareholderMarker,
      patchShareholder,
      patchExcel,
      userId,
      session?.access_token,
    ],
  )

  const handleAddressCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    navigator.clipboard.writeText(marker.address ?? "")
    toast.success("주소가 클립보드에 복사되었습니다")
  }

  const handleMarkerClick = () => {
    if (isGroupMarker) {
      setIsMarkerSelectModalOpen(true)
    } else if (!isOpen) {
      setIsOpen(true)
    }
  }

  const handleMarkerSelect = (selectedMarker: MapMarkerData) => {
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
          src: isGroupMarker
            ? getGroupMarkerImage(markers.length)
            : getMarkerImage(
                marker.status ?? "",
                marker.company,
                filterMenu.companyMenu,
              ),
          size: { width: 30, height: 40 },
        }}
      />
      {/* 인포윈도우 */}
      {isOpen && (
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
                <HeaderTitle>주주 정보</HeaderTitle>
                <CloseButton
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                  }}>
                  <Close fontSize="small" />
                </CloseButton>
              </InfoWindowHeader>

              <ExcelDataTable
                data={marker}
                history={isShareholderMarker ? mapHistory : undefined}
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
      )}
      {/* 마커 데이터 수정하기 모달 */}
      <Modal
        position="center"
        open={makerDataUpdateIsModalOpen}
        setOpen={(nextOpen) => {
          if (!nextOpen && patchModalSaveInProgress) return
          setMakerDataUpdateIsModalOpen(nextOpen)
        }}>
        <MakerPatchModalChildren
          makerData={isGroupMarker ? selectedGroupMarker : marker}
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
      {isGroupMarker && (
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

const InfoWindowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  min-height: 36px;
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
    padding: 6px 10px;
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
