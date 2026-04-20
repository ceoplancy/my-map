import CustomMapMarker, { type MapMarkerData } from "./custom-map-marker"

import { useEffect, useMemo, useState } from "react"
import { useGetFilterMenu } from "@/api/supabase"

interface MultipleMapMarkerProps {
  markers: MapMarkerData[]

  /** 지도 검색 등에서 선택된 주주 — 해당 마커·인포윈도우로 포커스 */
  highlightShareholderId?: string | null
}

interface MarkerGroup {
  position: { lat: number; lng: number }
  markers: MapMarkerData[]
}

const MultipleMapMarker = ({
  markers,
  highlightShareholderId,
}: MultipleMapMarkerProps) => {
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(
    null,
  )
  const { data: filterMenu } = useGetFilterMenu()

  useEffect(() => {
    if (!highlightShareholderId) return
    const m = markers.find((mk) => mk.id === highlightShareholderId)
    if (m) setSelectedMarker(m)
  }, [highlightShareholderId, markers])

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

  if (!filterMenu) return null

  return markerGroups.map((group) => {
    const isSelected = group.markers.some((m) => m.id === selectedMarker?.id)

    return (
      <CustomMapMarker
        key={`${group.position.lat}-${group.position.lng}`}
        marker={
          selectedMarker && isSelected ? selectedMarker : group.markers[0]
        }
        markers={group.markers}
        onMarkerSelect={setSelectedMarker}
        initialInfoWindowOpen={isSelected}
        forceKeepOpen={isSelected}
      />
    )
  })
}

export default MultipleMapMarker
