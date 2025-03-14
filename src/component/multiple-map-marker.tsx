import { Excel } from "@/types/excel"
import CustomMapMaker from "./custom-map-maker"

interface MultipleMapMarkerProps {
  markers: Excel[]
}

const MultipleMapMarker = ({ markers }: MultipleMapMarkerProps) =>
  markers.map((marker) => <CustomMapMaker key={marker.id} marker={marker} />)

export default MultipleMapMarker
