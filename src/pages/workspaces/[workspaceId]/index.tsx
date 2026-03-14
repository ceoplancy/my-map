import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Map, MapTypeControl, ZoomControl } from "react-kakao-maps-sdk"
import { useRouter } from "next/router"
import { debounce } from "lodash"
import {
  Menu,
  Settings,
  FilterAlt,
  LogoutOutlined,
  Clear as ClearIcon,
  RestartAlt,
  Business as BusinessIcon,
  List as ListIcon,
} from "@mui/icons-material"

import {
  useAdminStatus,
  useGetUserData,
  usePostSignOut,
  useMyWorkspaces,
  useMySignupStatus,
  useSession,
} from "@/api/auth"
import { useCurrentWorkspace } from "@/store/workspaceState"
import {
  useVisibleListIds,
  useShareholders,
  useWorkspaceMembers,
} from "@/api/workspace"
import Modal from "@/components/ui/modal"
import GlobalSpinner from "@/components/ui/global-spinner"
import styled from "@emotion/styled"
import FilterModalChildren from "@/components/ui/modal-children/filter-modal-children"
import supabase from "@/lib/supabase/supabaseClient"
import MultipleMapMarker from "@/components/ui/multiple-map-marker"
import { COLORS } from "@/styles/global-style"
import { useFilterStore } from "@/store/filterState"
import StatsCard from "@/components/StatsCard"
import { toast } from "react-toastify"
import { STORAGE_KEY } from "@/constants/map-storage"

interface MapBounds {
  sw: { lat: number; lng: number }
  ne: { lat: number; lng: number }
}

const WorkspaceMapPage = () => {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId: string }
  const mapRef = useRef<kakao.maps.Map>(null)
  const { data: user, isLoading } = useGetUserData()
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()
  const { data: signupStatus, isLoading: signupStatusLoading } =
    useMySignupStatus()
  const hasWorkspace = Array.isArray(workspaces) && workspaces.length > 0
  const legacyAdmin = String(user?.user?.user_metadata?.role).includes("admin")
  const isAdmin = legacyAdmin || hasWorkspace
  const { data: adminStatus } = useAdminStatus()
  const isServiceAdmin = adminStatus?.isServiceAdmin ?? false
  const pendingApproval =
    user?.user &&
    !workspacesLoading &&
    !signupStatusLoading &&
    !hasWorkspace &&
    !legacyAdmin &&
    signupStatus &&
    signupStatus.status === "pending"

  const resolvedWorkspace =
    workspaceId && Array.isArray(workspaces)
      ? (workspaces.find((w) => w.id === workspaceId) ?? null)
      : null

  const [, setCurrentWorkspace] = useCurrentWorkspace()

  useEffect(() => {
    if (!router.isReady || !workspaceId) return
    if (workspacesLoading) return
    if (!resolvedWorkspace) {
      router.replace("/workspaces")

      return
    }
    setCurrentWorkspace(resolvedWorkspace)
  }, [
    router.isReady,
    workspaceId,
    workspacesLoading,
    resolvedWorkspace,
    setCurrentWorkspace,
    router,
  ])

  const { resetFilters } = useFilterStore()

  const [isVisibleMenu, setIsVisibleMenu] = useState<boolean>(false)
  const [mapLevel, setMapLevel] = useState<number>(() => {
    if (typeof window === "undefined") return 6
    const savedLevel = localStorage.getItem(STORAGE_KEY.level)

    return savedLevel ? parseInt(savedLevel) : 6
  })
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false)
  const { statusFilter, companyFilter, cityFilter, stocks } = useFilterStore()
  const [currCenter, setCurrCenter] = useState<{ lat: number; lng: number }>(
    () => {
      if (typeof window === "undefined") return { lat: 37.5665, lng: 126.978 }
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

  const [workspace] = useCurrentWorkspace()
  const session = useSession().data
  const userId = session?.user?.id
  const visibleListIds = useVisibleListIds(workspace?.id ?? null, userId)
  const { data: workspaceMembers = [] } = useWorkspaceMembers(
    workspace?.id ?? null,
  )
  const myMember = workspaceMembers.find((m) => m.user_id === userId)
  const isWorkspaceAdmin =
    !!myMember &&
    ["service_admin", "top_admin", "admin"].includes(myMember.role)

  const {
    data: shareholderData = [],
    refetch: shareholderRefetch,
    isLoading: shareholdersLoading,
  } = useShareholders({
    listIds: visibleListIds.length > 0 ? visibleListIds : null,
    status: statusFilter?.length ? statusFilter : undefined,
    company: companyFilter?.length ? companyFilter : undefined,
    stocks: stocks?.length ? stocks : undefined,
    city: cityFilter || undefined,
    lat: currCenter.lat,
    lng: currCenter.lng,
    mapLevel,
  })

  const mapMarkers = shareholderData
  const mapMarkersRefetch = shareholderRefetch

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
    },
    [debouncedMapUpdate],
  )

  const handleApplyFilters = () => {
    mapMarkersRefetch()
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
      mapMarkersRefetch()
    }
  }, [mapBounds, mapLevel, mapMarkersRefetch])

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.reload()
    })

    return () => authListener.subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    const setViewHeight = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }
    setViewHeight()
    window.addEventListener("resize", setViewHeight)

    return () => window.removeEventListener("resize", setViewHeight)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      toast.error("로그인이 필요합니다.")
      router.push("/sign-in")
    }
  }, [isLoading, router, user])

  if (pendingApproval) {
    return (
      <PendingContainer>
        <PendingCard>
          <PendingTitle>가입 승인 대기 중</PendingTitle>
          <PendingText>
            가입 신청이 접수되었습니다. 운영사 승인 후 서비스를 이용할 수
            있습니다.
          </PendingText>
          <LogoutButton onClick={() => logout()}>로그아웃</LogoutButton>
        </PendingCard>
      </PendingContainer>
    )
  }

  const resolvingWorkspace =
    !router.isReady ||
    !workspaceId ||
    workspacesLoading ||
    (workspaceId && !resolvedWorkspace)

  if (resolvingWorkspace) {
    return (
      <SpinnerFrame>
        <GlobalSpinner
          width={18}
          height={18}
          marginRight={18}
          dotColor="#8536FF"
        />
      </SpinnerFrame>
    )
  }

  return (
    <>
      {(shareholdersLoading || isLoading) && (
        <SpinnerFrame>
          <GlobalSpinner
            width={18}
            height={18}
            marginRight={18}
            dotColor="#8536FF"
          />
        </SpinnerFrame>
      )}

      <MapContainer>
        <Map
          ref={mapRef}
          center={{ lat: currCenter.lat, lng: currCenter.lng }}
          style={{ width: "100%", height: "100%" }}
          level={mapLevel}
          onZoomChanged={handleZoomChange}
          onDragEnd={handleDragEnd}>
          <MapTypeControl position={"TOPRIGHT"} />
          <ZoomControl position={"RIGHT"} />
          {mapMarkers.length > 0 && user && (
            <MultipleMapMarker
              markers={mapMarkers as unknown as import("@/types/excel").Excel[]}
            />
          )}

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
            {hasWorkspace && visibleListIds.length === 0 && (
              <EmptyWorkspaceHint>
                이 워크스페이스에 노출된 주주명부가 없습니다. 관리자 화면에서
                명부를 추가·노출해 주세요.
              </EmptyWorkspaceHint>
            )}
            {hasWorkspace && (
              <MenuItem
                onClick={async () => {
                  const {
                    data: { session: s },
                  } = await supabase.auth.getSession()
                  if (!s?.access_token) {
                    toast.error("로그인이 필요합니다.")

                    return
                  }
                  try {
                    const res = await fetch("/api/resource-requests", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${s.access_token}`,
                      },
                      body: JSON.stringify({
                        workspace_id: workspace?.id ?? null,
                      }),
                    })
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}))
                      toast.error(err.error || "요청에 실패했습니다.")

                      return
                    }
                    toast.success("용역 충원 요청이 접수되었습니다.")
                  } catch {
                    toast.error("요청 중 오류가 발생했습니다.")
                  }
                }}>
                용역 요청
              </MenuItem>
            )}
            <div style={{ flex: 1 }} />
            <MenuItem onClick={() => router.push("/workspaces")}>
              <ListIcon />
              워크스페이스 목록
            </MenuItem>
            {isWorkspaceAdmin && (
              <MenuItem
                onClick={() =>
                  router.push(
                    workspace ? `/workspaces/${workspace.id}/admin` : "/admin",
                  )
                }
                style={{ color: COLORS.purple[700] }}>
                <BusinessIcon />
                워크스페이스 관리
              </MenuItem>
            )}
            {isAdmin && (
              <MenuItem
                onClick={() =>
                  router.push(
                    isServiceAdmin
                      ? "/admin/integrated"
                      : workspace
                        ? `/workspaces/${workspace.id}/admin`
                        : "/admin",
                  )
                }
                style={{ color: COLORS.purple[700] }}>
                <Settings />
                통합 관리
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
            />
          </Modal>
        </Map>
      </MapContainer>
    </>
  )
}

export default WorkspaceMapPage

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

const EmptyWorkspaceHint = styled.p`
  font-size: 0.8125rem;
  color: ${COLORS.gray[500]};
  line-height: 1.4;
  padding: 0.5rem 0;
  margin: 0;
`

const MapContainer = styled.div`
  width: 100%;
  height: 100vh;
  position: relative;

  @media screen and (max-width: 768px) {
    height: calc(var(--vh, 1vh) * 100);
  }
`

const PendingContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 1rem;
`

const PendingCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
`

const PendingTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1f2937;
`

const PendingText = styled.p`
  font-size: 0.9375rem;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 1.5rem;
`

const LogoutButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    background: #1557b0;
  }
`
