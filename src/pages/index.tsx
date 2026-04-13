import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import {
  Map,
  MapTypeControl,
  ZoomControl,
  CustomOverlayMap,
} from "react-kakao-maps-sdk"
import { useRouter } from "next/router"
import { debounce } from "lodash"
import {
  Menu,
  Settings,
  FilterAlt,
  LogoutOutlined,
  Clear as ClearIcon,
  RestartAlt,
} from "@mui/icons-material"

import { useGetExcel } from "@/api/supabase"
import { useGetUserData, usePostSignOut } from "@/api/auth"
import Modal from "@/component/modal"
import GlobalSpinner from "@/component/global-spinner"
import styled from "@emotion/styled"
import FilterModalChildren from "@/component/modal-children/filter-modal-children"
import supabase from "@/lib/supabase/supabaseClient"
import MultipleMapMarker from "@/component/multiple-map-marker"
import InfoPanel from "@/component/info-panel"
import { COLORS } from "@/styles/global-style"
import { useFilterStore } from "@/store/filterState"
import StatsCard from "@/components/StatsCard"
import { toast } from "react-toastify"
import { Excel } from "@/types/excel"

interface MapBounds {
  sw: { lat: number; lng: number }
  ne: { lat: number; lng: number }
}

export const STORAGE_KEY = {
  position: "map_last_position",
  level: "map_last_level",
}

const Home = () => {
  const router = useRouter()
  const mapRef = useRef<kakao.maps.Map>(null)
  const { data: user, isLoading } = useGetUserData()
  const isAdmin = String(user?.user?.user_metadata?.role).includes("admin")
  const { resetFilters } = useFilterStore()

  const [isVisibleMenu, setIsVisibleMenu] = useState<boolean>(false)
  const [mapLevel, setMapLevel] = useState<number>(() => {
    if (typeof window === "undefined") {
      return 6
    }

    const savedLevel = localStorage.getItem(STORAGE_KEY.level)

    return savedLevel ? parseInt(savedLevel) : 6
  })
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false)
  const {
    statusFilter,
    companyFilter,
    cityFilter,
    stocks,
    rosterStockMin,
    rosterStockMax,
  } = useFilterStore()
  const [currCenter, setCurrCenter] = useState<{ lat: number; lng: number }>(
    () => {
      if (typeof window === "undefined") {
        return { lat: 37.5665, lng: 126.978 }
      }

      const savedPosition = localStorage.getItem(STORAGE_KEY.position)

      return savedPosition
        ? JSON.parse(savedPosition)
        : { lat: 37.5665, lng: 126.978 }
    },
  )
  const { mutate: logout } = usePostSignOut()
  const [mapBounds, setMapBounds] = useState<MapBounds>({
    sw: { lat: 0, lng: 0 },
    ne: { lat: 0, lng: 0 },
  })

  const mapFilterParams = useMemo((): import("@/types").FilterParams => {
    let rMin: number | null = null
    let rMax: number | null = null
    if (companyFilter.length === 1) {
      if (rosterStockMin.trim() !== "") {
        const n = Number(rosterStockMin)
        rMin = Number.isNaN(n) ? null : n
      }
      if (rosterStockMax.trim() !== "") {
        const n = Number(rosterStockMax)
        rMax = Number.isNaN(n) ? null : n
      }
    }

    return {
      status: statusFilter,
      company: companyFilter,
      stocks,
      rosterStockMin: companyFilter.length === 1 ? rMin : null,
      rosterStockMax: companyFilter.length === 1 ? rMax : null,
      lat: currCenter.lat,
      lng: currCenter.lng,
      bounds: mapBounds,
      city: cityFilter,
      userMetadata: user?.user.user_metadata,
    }
  }, [
    statusFilter,
    companyFilter,
    stocks,
    rosterStockMin,
    rosterStockMax,
    currCenter.lat,
    currCenter.lng,
    mapBounds,
    cityFilter,
    user?.user.user_metadata,
  ])

  const {
    data: excelData,
    refetch: excelDataRefetch,
    isLoading: excelIsLoading,
  } = useGetExcel(mapLevel, mapFilterParams)

  const debouncedMapUpdate = useMemo(
    () =>
      debounce((target: kakao.maps.Map) => {
        const bounds = target.getBounds()
        const latlng = target.getCenter()

        const newCenter = {
          lat: latlng.getLat(),
          lng: latlng.getLng(),
        }

        setCurrCenter(newCenter)
        localStorage.setItem(STORAGE_KEY.position, JSON.stringify(newCenter))

        setMapBounds({
          sw: {
            lat: bounds.getSouthWest().getLat(),
            lng: bounds.getSouthWest().getLng(),
          },
          ne: {
            lat: bounds.getNorthEast().getLat(),
            lng: bounds.getNorthEast().getLng(),
          },
        })
      }, 500),
    [],
  )

  const [openMarkerIds, setOpenMarkerIds] = useState<number[]>([])
  const [, setMapMoveSeq] = useState(0)

  /** 검색으로 이동했을 때 뷰포트 밖이면 excelData에 없을 수 있어 임시로 패널 데이터 유지 */
  const [focusRowOverride, setFocusRowOverride] = useState<Excel | null>(null)

  const openMarkers = useMemo(() => {
    if (!excelData) return []

    return openMarkerIds
      .map((id) => {
        const fromData = excelData.find((e: Excel) => e.id === id)
        if (fromData) return fromData
        if (focusRowOverride && focusRowOverride.id === id) {
          return focusRowOverride
        }

        return null
      })
      .filter((m): m is Excel => m != null)
  }, [openMarkerIds, excelData, focusRowOverride])

  const getYAnchor = (lat: number, lng: number) => {
    const map = mapRef.current
    if (!map) return 0
    const projection = map.getProjection()
    const point = projection.pointFromCoords(new kakao.maps.LatLng(lat, lng))
    const mapHeight = map.getNode().clientHeight

    return point.y / mapHeight > 0.55 ? 1.1 : 0
  }

  const handleMarkerClick = useCallback((marker: Excel) => {
    setOpenMarkerIds((prev) => {
      const exists = prev.includes(marker.id)

      return exists
        ? prev.filter((id) => id !== marker.id)
        : [...prev, marker.id]
    })
  }, [])

  const handleCloseInfoPanel = useCallback((markerId: number) => {
    setOpenMarkerIds((prev) => prev.filter((id) => id !== markerId))
    setFocusRowOverride((f) => (f?.id === markerId ? null : f))
  }, [])

  const handleNavigateToShareholder = useCallback(
    (row: Excel) => {
      if (row.lat == null || row.lng == null) {
        toast.error("좌표가 없어 지도로 이동할 수 없습니다.")

        return
      }
      const map = mapRef.current
      const pos = new kakao.maps.LatLng(row.lat, row.lng)
      if (map) {
        map.setCenter(pos)
        map.setLevel(3)
      }
      const c = { lat: row.lat, lng: row.lng }
      setCurrCenter(c)
      localStorage.setItem(STORAGE_KEY.position, JSON.stringify(c))
      localStorage.setItem(STORAGE_KEY.level, "3")
      setMapLevel(3)
      setFocusRowOverride(row)
      setOpenMarkerIds([row.id])
      void excelDataRefetch()
      setIsFilterModalOpen(false)
    },
    [excelDataRefetch],
  )

  const handleZoomStart = useCallback(() => {
    setOpenMarkerIds([])
  }, [])

  const handleZoomChange = useCallback(
    (target: kakao.maps.Map) => {
      const currentLevel = target.getLevel()

      if (mapLevel !== currentLevel) {
        setMapLevel(currentLevel)
        localStorage.setItem(STORAGE_KEY.level, currentLevel.toString())
        debouncedMapUpdate(target)
      }
    },
    [debouncedMapUpdate, mapLevel],
  )

  const handleDragEnd = useCallback(
    (target: kakao.maps.Map) => {
      debouncedMapUpdate(target)
      setMapMoveSeq((s) => s + 1)
    },
    [debouncedMapUpdate],
  )

  const handleApplyFilters = () => {
    excelDataRefetch()
    setIsFilterModalOpen(false)
  }

  const handleReset = useCallback(() => {
    localStorage.setItem(STORAGE_KEY.level, "6")
    localStorage.setItem(
      STORAGE_KEY.position,
      JSON.stringify({ lat: 37.5665, lng: 126.978 }),
    )
    resetFilters()
    router.reload()
  }, [router, resetFilters])

  useEffect(() => {
    if (mapBounds.sw.lat !== 0 && mapBounds.sw.lng !== 0) {
      excelDataRefetch()
    }
  }, [mapBounds, mapLevel, excelDataRefetch])

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.reload()
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    const setViewHeight = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    setViewHeight()
    window.addEventListener("resize", setViewHeight)

    return () => {
      window.removeEventListener("resize", setViewHeight)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      toast.error("로그인이 필요합니다.")
      router.push("/sign-in")
    }
  }, [isLoading, router, user])

  return (
    <>
      {(excelIsLoading || isLoading) && (
        <SpinnerFrame>
          <GlobalSpinner />
        </SpinnerFrame>
      )}

      <MapContainer>
        <Map
          ref={mapRef}
          center={{
            lat: currCenter.lat,
            lng: currCenter.lng,
          }}
          style={{
            width: "100%",
            height: "100%",
          }}
          level={mapLevel}
          onZoomChanged={handleZoomChange}
          onZoomStart={handleZoomStart}
          onDragEnd={handleDragEnd}>
          <MapTypeControl position={"TOPRIGHT"} />
          <ZoomControl position={"RIGHT"} />
          {excelData && user && (
            <MultipleMapMarker
              markers={excelData}
              onMarkerClick={handleMarkerClick}
            />
          )}

          {openMarkers.map((m) => {
            const anchor = getYAnchor(m.lat || 0, m.lng || 0)

            return (
              <CustomOverlayMap
                key={`${m.id}-${anchor > 0.5 ? "above" : "below"}`}
                position={{ lat: m.lat || 0, lng: m.lng || 0 }}
                clickable
                yAnchor={anchor}
                zIndex={100}>
                <InfoPanel
                  marker={m}
                  onClose={() => handleCloseInfoPanel(m.id)}
                />
              </CustomOverlayMap>
            )
          })}

          <MenuButton onClick={() => setIsVisibleMenu(!isVisibleMenu)}>
            <Menu />
          </MenuButton>

          <MenuOverlay
            isVisible={isVisibleMenu}
            onClick={() => setIsVisibleMenu(false)}
          />

          <SideMenu isVisible={isVisibleMenu}>
            <MenuHeader>
              <MenuTitle>대시보드</MenuTitle>
              <CloseButton onClick={() => setIsVisibleMenu(false)}>
                <ClearIcon />
              </CloseButton>
            </MenuHeader>
            <MenuItem onClick={handleReset} style={{ color: COLORS.red[600] }}>
              <RestartAlt />
              초기화
            </MenuItem>
            <MenuItem onClick={() => setIsFilterModalOpen(true)}>
              <FilterAlt />
              필터 설정
            </MenuItem>
            <StatsCard />
            <div style={{ flex: 1 }} />
            {isAdmin && (
              <MenuItem
                onClick={() => router.push("/admin")}
                style={{ color: COLORS.purple[700] }}>
                <Settings />
                관리자
              </MenuItem>
            )}
            <MenuItem
              onClick={() => logout()}
              style={{ color: COLORS.red[600] }}>
              <LogoutOutlined />
              로그아웃
            </MenuItem>
          </SideMenu>

          <Modal open={isFilterModalOpen} setOpen={setIsFilterModalOpen}>
            <FilterModalChildren
              handleClose={() => setIsFilterModalOpen(false)}
              handleApplyFilters={handleApplyFilters}
              onNavigateToShareholder={handleNavigateToShareholder}
            />
          </Modal>
        </Map>
      </MapContainer>
    </>
  )
}

export default Home

const SpinnerFrame = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
`

const MenuButton = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 10;
  background-color: white;
  padding: 12px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${COLORS.gray[50]};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`

const MenuOverlay = styled.div<{ isVisible: boolean }>`
  display: none;
`

const SideMenu = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 80px;
  left: 20px;
  width: 320px;
  height: auto;
  max-height: calc(100vh - 100px);
  background: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 24px;
  border-radius: 16px;
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  visibility: ${(props) => (props.isVisible ? "visible" : "hidden")};
  transform: translateX(${(props) => (props.isVisible ? "0" : "-20px")});
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 11;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  pointer-events: ${(props) => (props.isVisible ? "auto" : "none")};

  @media (max-width: 768px) {
    width: 260px;
  }
`

const MenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

const MenuTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${COLORS.gray[900]};
`

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.gray[500]};
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
  }
`

const MenuItem = styled.div`
  padding: 0px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${COLORS.gray[700]};
  margin-top: 4px;
  margin-bottom: 4px;

  &:hover {
    background: ${COLORS.gray[50]};
    color: ${COLORS.gray[900]};
  }

  svg {
    font-size: 20px;
  }
`

const MapContainer = styled.div`
  width: 100%;
  height: 100vh;
  position: relative;

  @media screen and (max-width: 768px) {
    height: calc(var(--vh, 1vh) * 100);
  }
`
