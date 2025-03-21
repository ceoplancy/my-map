import { Excel } from "@/types/excel"
import CustomMapMarker from "./custom-map-marker"

import { useMemo, useState } from "react"
import { useGetFilterMenu } from "@/api/supabase"

interface MultipleMapMarkerProps {
  markers: Excel[]
}

interface MarkerGroup {
  position: { lat: number; lng: number }
  markers: Excel[]
}

const MultipleMapMarker = ({ markers }: MultipleMapMarkerProps) => {
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
