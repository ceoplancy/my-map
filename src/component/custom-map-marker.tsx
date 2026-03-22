import { useGetFilterMenu } from "@/api/supabase"
import { useState } from "react"
import { CustomOverlayMap, MapMarker } from "react-kakao-maps-sdk"
import styled from "@emotion/styled"
import { Excel } from "@/types/excel"
import Modal from "./modal"
import { Close } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"

export const STATUS_MARKERS = {
  미방문: "/svg/default.svg",
  보류: "/svg/pending.svg",
  완료: "/svg/complete.svg",
  실패: "/svg/fail.svg",
} as const

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

interface CustomMapMarkerProps {
  marker: Excel
  markers?: Excel[]
  onMarkerClick: (_marker: Excel) => void
}

interface MarkerStatusProps {
  status: string
}

const CustomMapMarker = ({
  marker,
  markers,
  onMarkerClick,
}: CustomMapMarkerProps) => {
  const { data: filterMenu } = useGetFilterMenu()
  const isGroupMarker = markers && markers.length > 1

  const [isMarkerSelectModalOpen, setIsMarkerSelectModalOpen] = useState(false)

  const handleMarkerClick = () => {
    if (isGroupMarker) {
      setIsMarkerSelectModalOpen(true)
    } else {
      onMarkerClick(marker)
    }
  }

  const handleGroupSelect = (selected: Excel) => {
    setIsMarkerSelectModalOpen(false)
    onMarkerClick(selected)
  }

  if (!filterMenu) return null

  return (
    <>
      <MapMarker
        position={{
          lat: marker.lat || 0,
          lng: marker.lng || 0,
        }}
        clickable={true}
        onClick={handleMarkerClick}
        image={{
          src: getMarkerImage(
            marker.status ?? "",
            marker.company,
            filterMenu.companyMenu,
          ),
          size: { width: 30, height: 40 },
        }}
      />
      {isGroupMarker && (
        <CustomOverlayMap
          position={{
            lat: marker.lat || 0,
            lng: marker.lng || 0,
          }}
          xAnchor={0.47}
          yAnchor={1.9}
          clickable>
          <MarkerCounter onClick={handleMarkerClick}>
            {markers.length}
          </MarkerCounter>
        </CustomOverlayMap>
      )}
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
                <MarkerItem key={m.id} onClick={() => handleGroupSelect(m)}>
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
    </>
  )
}

export default CustomMapMarker

const MarkerCounter = styled.div`
  background-color: white;
  color: ${COLORS.gray[900]};
  width: 17px;
  height: 17px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
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

const MarkerItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  background-color: transparent;
  border: 1px solid #e5e7eb;

  &:hover {
    background-color: #f9fafb;
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

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
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
