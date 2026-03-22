import { Excel } from "@/types/excel"
import CustomMapMarker from "./custom-map-marker"
import { useMemo } from "react"

interface MultipleMapMarkerProps {
  markers: Excel[]
  onMarkerClick: (_marker: Excel) => void
}

interface MarkerGroup {
  position: { lat: number; lng: number }
  markers: Excel[]
}

const MultipleMapMarker = ({
  markers,
  onMarkerClick,
}: MultipleMapMarkerProps) => {
  const markerGroups = useMemo(() => {
    const groups: MarkerGroup[] = []
    markers.forEach((m) => {
      const existingGroup = groups.find(
        (group) => group.position.lat === m.lat && group.position.lng === m.lng,
      )
      if (existingGroup) {
        existingGroup.markers.push(m)
      } else {
        groups.push({
          position: { lat: m.lat || 0, lng: m.lng || 0 },
          markers: [m],
        })
      }
    })

    return groups
  }, [markers])

  return markerGroups.map((group) => (
    <CustomMapMarker
      key={`${group.position.lat}-${group.position.lng}`}
      marker={group.markers[0]}
      markers={group.markers}
      onMarkerClick={onMarkerClick}
    />
  ))
}

export default MultipleMapMarker
