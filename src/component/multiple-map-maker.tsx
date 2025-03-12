import { Excel } from "@/types/excel"
import CustomMapMaker from "./custom-map-maker"

interface MultipleMapMarkerProps {
  markers: Excel[]
  userId: string
}

const MultipleMapMarker = ({ markers, userId }: MultipleMapMarkerProps) => {
  return markers.map((marker) => (
    <CustomMapMaker key={marker.id} marker={marker} userId={userId} />
  ))
}

export default MultipleMapMarker
