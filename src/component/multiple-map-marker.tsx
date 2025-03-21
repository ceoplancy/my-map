import { Excel } from "@/types/excel"
import CustomMapMarker from "./custom-map-marker"

import { useMemo, useState } from "react"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { CustomOverlayMap, MapMarker } from "react-kakao-maps-sdk"
import Modal from "./modal"
import { useGetFilterMenu } from "@/api/supabase"
import { Close as CloseIcon } from "@mui/icons-material"

interface MultipleMapMarkerProps {
  markers: Excel[]
}

interface MarkerGroup {
  position: { lat: number; lng: number }
  markers: Excel[]
}

const MultipleMapMarker = ({ markers }: MultipleMapMarkerProps) => {
  const [selectedGroup, setSelectedGroup] = useState<MarkerGroup | null>(null)
  const [selectedMarker, setSelectedMarker] = useState<Excel | null>(null)
  const { data: filterMenu } = useGetFilterMenu()

  const markerGroups = useMemo(() => {
    const groups: MarkerGroup[] = []
    markers.forEach((marker) => {
      const existingGroup = groups.find(
        (group) =>
          group.position.lat === marker.lat &&
          group.position.lng === marker.lng,
      )
      if (existingGroup) {
        existingGroup.markers.push(marker)
      } else {
        groups.push({
          position: { lat: marker.lat || 0, lng: marker.lng || 0 },
          markers: [marker],
        })
      }
    })

    return groups
  }, [markers])

  const handleMarkerSelect = (marker: Excel) => {
    setSelectedMarker(marker)
    setSelectedGroup(null)
  }

  if (!filterMenu) return null

  return (
    <>
      {markerGroups.map((group) => {
        const isSelected = group.markers.some(
          (m) => m.id === selectedMarker?.id,
        )

        return (
          <CustomMapMarker
            key={`${group.position.lat}-${group.position.lng}`}
            marker={
              selectedMarker && isSelected ? selectedMarker : group.markers[0]
            }
            markers={group.markers}
            onMarkerSelect={setSelectedMarker}
            initialInfoWindowOpen={isSelected}
          />
        )
      })}

      {/* 중복 마커 선택 모달 */}
      <Modal
        open={!!selectedGroup}
        setOpen={() => {
          setSelectedGroup(null)
          setSelectedMarker(null)
        }}
        position="center">
        <MarkerSelectContainer>
          <ModalHeader>
            <HeaderTitle>주주 선택</HeaderTitle>
            <CloseButton
              onClick={() => {
                setSelectedGroup(null)
                setSelectedMarker(null)
              }}>
              <CloseIcon />
            </CloseButton>
          </ModalHeader>
          <MarkerList>
            {selectedGroup?.markers.map((marker) => (
              <MarkerItem
                key={marker.id}
                onClick={() => handleMarkerSelect(marker)}
                selected={selectedMarker?.id === marker.id}>
                <MarkerInfo>
                  <MarkerName>{marker.name}</MarkerName>
                  <MarkerCompany>{marker.company}</MarkerCompany>
                </MarkerInfo>
                <MarkerStatus status={marker.status}>
                  {marker.status}
                </MarkerStatus>
              </MarkerItem>
            ))}
          </MarkerList>
        </MarkerSelectContainer>
      </Modal>
    </>
  )
}

export default MultipleMapMarker

const MarkerSelectContainer = styled.div`
  padding: 24px;
  min-width: 320px;
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`

const HeaderTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${COLORS.gray[900]};
`

const MarkerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MarkerItem = styled.div<{ selected?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: ${({ selected }) => (selected ? COLORS.blue[50] : "white")};
  border: 1px solid
    ${({ selected }) => (selected ? COLORS.blue[200] : COLORS.gray[200])};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ selected }) =>
      selected ? COLORS.blue[100] : COLORS.gray[50]};
    border-color: ${({ selected }) =>
      selected ? COLORS.blue[300] : COLORS.gray[300]};
    transform: translateY(-1px);
  }
`

const MarkerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const MarkerName = styled.div`
  font-weight: 500;
  color: ${COLORS.gray[900]};
`

const MarkerCompany = styled.div`
  font-size: 12px;
  color: ${COLORS.gray[600]};
`

const MarkerStatus = styled.div<{ status: string | null }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ status }) => {
    switch (status) {
      case "완료":
        return COLORS.green[50]
      case "보류":
        return COLORS.yellow[50]
      case "실패":
        return COLORS.red[50]
      default:
        return COLORS.gray[50]
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case "완료":
        return COLORS.green[700]
      case "보류":
        return COLORS.yellow[700]
      case "실패":
        return COLORS.red[700]
      default:
        return COLORS.gray[700]
    }
  }};
`

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  border-radius: 8px;
  color: ${COLORS.gray[500]};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
    transform: rotate(90deg);
  }
`
