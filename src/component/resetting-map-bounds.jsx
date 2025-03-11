import { useEffect, useMemo } from "react"
import { useMap } from "react-kakao-maps-sdk"

const ReSettingMapBounds = ({ points }) => {
  const map = useMap()
  const boundsMemo = useMemo(() => {
    const bounds = new kakao.maps.LatLngBounds()

    points?.forEach((point) => {
      bounds.extend(new kakao.maps.LatLng(point.lat, point.lng))
    })

    return bounds
  }, [points])

  useEffect(() => {
    map.setBounds(boundsMemo)
  }, [])

  return <></>
}

export default ReSettingMapBounds
