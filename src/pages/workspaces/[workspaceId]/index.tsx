import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Map, ZoomControl } from "react-kakao-maps-sdk"
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
  Search as SearchIcon,
} from "@mui/icons-material"

import {
  useAdminStatus,
  useAuth,
  usePostSignOut,
  useMyWorkspaces,
  useMySignupStatus,
} from "@/api/auth"
import { useCurrentWorkspace } from "@/store/workspaceState"
import {
  useVisibleListIds,
  useDashboardListIds,
  useShareholderById,
  useShareholderLists,
  useShareholders,
  useWorkspaceMembers,
  type ShareholdersParams,
} from "@/api/workspace"
import Modal, { ModalChrome } from "@/components/ui/modal"
import GlobalSpinner from "@/components/ui/global-spinner"
import styled from "@emotion/styled"
import FilterModalChildren from "@/components/ui/modal-children/filter-modal-children"
import { postWorkspaceResourceRequest } from "@/api/nextApi"
import { getAccessToken } from "@/lib/auth/clientAuth"
import MultipleMapMarker from "@/components/ui/multiple-map-marker"
import { COLORS } from "@/styles/global-style"
import { useFilterStore } from "@/store/filterState"
import StatsCard from "@/components/StatsCard"
import { toast } from "react-toastify"
import { getMapStorageKeys } from "@/constants/map-storage"
import { ROUTES } from "@/constants/routes"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { getFilterSummaryChips } from "@/lib/filterSummaryChips"
import RulesAcceptanceGate from "@/components/workspace/RulesAcceptanceGate"

const WorkspaceMapPage = () => {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId: string }
  const mapRef = useRef<kakao.maps.Map>(null)
  const { user, session, isLoading } = useAuth()
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()
  const { data: signupStatus, isLoading: signupStatusLoading } =
    useMySignupStatus()
  const hasWorkspace = Array.isArray(workspaces) && workspaces.length > 0
  const legacyAdmin = String(user?.user_metadata?.role).includes("admin")
  const { data: adminStatus } = useAdminStatus()
  const isServiceAdmin = adminStatus?.isServiceAdmin ?? false
  const pendingApproval =
    user &&
    !workspacesLoading &&
    !signupStatusLoading &&
    !hasWorkspace &&
    !legacyAdmin &&
    signupStatus &&
    signupStatus.status === "pending"

  const revokedApproval =
    user &&
    !signupStatusLoading &&
    !legacyAdmin &&
    signupStatus &&
    signupStatus.status === "revoked"

  const resolvedWorkspace =
    workspaceId && Array.isArray(workspaces)
      ? (workspaces.find((w) => w.id === workspaceId) ?? null)
      : null

  const [, setCurrentWorkspace] = useCurrentWorkspace()

  useEffect(() => {
    if (!router.isReady || !workspaceId) return
    if (workspacesLoading) return
    if (!resolvedWorkspace) {
      // 로그아웃 직후 workspaces가 []가 되면 resolvedWorkspace가 null이 되어
      // 무조건 /workspaces로 보내면 로그아웃이 깨진 것처럼 보임. 인증 로딩 중에는 대기.
      if (isLoading) return
      // 세션이 없으면 비로그인 (로그아웃 직후 user만 stale인 경우 방지 — auth.ts에서 캐시 즉시 비움)
      if (!session) {
        router.replace(ROUTES.signIn)

        return
      }
      router.replace(ROUTES.workspaces)

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
    isLoading,
    session,
  ])

  const { resetFilters, ensureWorkspaceScope } = useFilterStore()

  const wsId = typeof workspaceId === "string" ? workspaceId : null

  const [isVisibleMenu, setIsVisibleMenu] = useState<boolean>(false)
  const [mapLevel, setMapLevel] = useState<number>(6)
  const [highlightShareholderId, setHighlightShareholderId] = useState<
    string | null
  >(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false)
  const {
    statusFilter,
    statusPrimaryFilter,
    companyFilter,
    cityFilter,
    stocks,
    companyStockFilterMap,
    companyFilterProfiles,
  } = useFilterStore()
  const [currCenter, setCurrCenter] = useState<{ lat: number; lng: number }>({
    lat: 37.5665,
    lng: 126.978,
  })
  const { mutate: logout } = usePostSignOut()

  const [workspace] = useCurrentWorkspace()

  const userId = user?.id
  const mapWorkspaceId = resolvedWorkspace?.id ?? null
  const visibleListIds = useVisibleListIds(mapWorkspaceId, userId)
  const dashboardListIds = useDashboardListIds(mapWorkspaceId, userId)
  const { isLoading: shareholderListsLoading } =
    useShareholderLists(mapWorkspaceId)
  const { data: workspaceMembers = [] } = useWorkspaceMembers(mapWorkspaceId)
  const myMember = workspaceMembers.find((m) => m.user_id === userId)

  /**
   * - top_admin / admin: 해당 workspace_id 멤버 행으로 판별
   * - service_admin: 멤버 행은 workspace_id IS NULL 뿐이라 위 쿼리에 포함되지 않음 → isServiceAdmin 으로 판별
   */
  const isWorkspaceAdmin =
    isServiceAdmin ||
    (!!myMember && ["top_admin", "admin"].includes(myMember.role))

  const shareholderParams = useMemo((): ShareholdersParams => {
    return {
      listIds: visibleListIds.length > 0 ? visibleListIds : null,
      status:
        statusFilter?.length && !statusPrimaryFilter?.length
          ? statusFilter
          : undefined,
      statusPrimaryFilter:
        statusPrimaryFilter?.length > 0 ? statusPrimaryFilter : undefined,
      company: companyFilter?.length ? companyFilter : undefined,
      stocks: stocks?.length ? stocks : undefined,
      companyStockFilterMap,
      companyFilterProfiles:
        companyFilterProfiles && Object.keys(companyFilterProfiles).length > 0
          ? companyFilterProfiles
          : undefined,
      city: cityFilter || undefined,
      lat: currCenter.lat,
      lng: currCenter.lng,
      mapLevel,
    }
  }, [
    visibleListIds,
    statusFilter,
    statusPrimaryFilter,
    companyFilter,
    stocks,
    companyStockFilterMap,
    companyFilterProfiles,
    cityFilter,
    currCenter.lat,
    currCenter.lng,
    mapLevel,
  ])

  /** 대시보드 의결권·명부 현황: 워크스페이스 명부 전체(지도 노출 여부·필터와 무관) */
  const mapStatsParams = useMemo((): ShareholdersParams => {
    return {
      listIds: dashboardListIds.length > 0 ? dashboardListIds : null,
    }
  }, [dashboardListIds])

  const {
    data: shareholderData,
    refetch: shareholderRefetch,
    isLoading: shareholdersLoading,
  } = useShareholders(shareholderParams)

  const highlightIdFromQuery = useMemo(() => {
    const h = router.query.highlight
    if (typeof h === "string") return h
    if (Array.isArray(h) && h[0]) return h[0]

    return null
  }, [router.query.highlight])

  const {
    data: focusShareholderRow,
    isFetched: focusShareholderFetched,
    isError: focusShareholderError,
  } = useShareholderById(highlightIdFromQuery)

  const mapMarkers = useMemo(() => {
    const base = shareholderData ?? []
    if (!focusShareholderRow) return base
    if (base.some((m) => m.id === focusShareholderRow.id)) return base

    return [...base, focusShareholderRow]
  }, [shareholderData, focusShareholderRow])

  const mapMarkersRefetch = shareholderRefetch
  const appliedHighlightRef = useRef<string | null>(null)

  const filterSummaryChips = useMemo(
    () =>
      getFilterSummaryChips({
        cityFilter: cityFilter ?? "",
        statusPrimaryFilter: statusPrimaryFilter ?? [],
        companyFilter: companyFilter ?? [],
        companyFilterProfiles: companyFilterProfiles ?? {},
        stocks: stocks ?? [],
        companyStockFilterMap: companyStockFilterMap ?? {},
      }),
    [
      cityFilter,
      statusPrimaryFilter,
      companyFilter,
      companyFilterProfiles,
      stocks,
      companyStockFilterMap,
    ],
  )

  useEffect(() => {
    if (!highlightIdFromQuery) {
      appliedHighlightRef.current = null
    }
  }, [highlightIdFromQuery])

  useEffect(() => {
    if (!router.isReady || typeof workspaceId !== "string") return
    const id = highlightIdFromQuery
    if (!id) return
    if (appliedHighlightRef.current === id) return

    const m = mapMarkers.find((mk) => mk.id === id)
    if (!m || m.lat == null || m.lng == null) {
      if (
        (focusShareholderFetched || focusShareholderError) &&
        focusShareholderRow == null &&
        !shareholdersLoading
      ) {
        void router.replace(`/workspaces/${workspaceId}`, undefined, {
          shallow: true,
        })
      }

      return
    }
    if (typeof window === "undefined" || !window.kakao?.maps || !mapRef.current)
      return

    appliedHighlightRef.current = id
    setHighlightShareholderId(id)
    mapRef.current.setCenter(new window.kakao.maps.LatLng(m.lat, m.lng))
    mapRef.current.setLevel(4)
    setMapLevel(4)
    if (wsId) {
      const keys = getMapStorageKeys(wsId)
      localStorage.setItem(keys.level, "4")
      localStorage.setItem(
        keys.position,
        JSON.stringify({ lat: m.lat, lng: m.lng }),
      )
    }
    void router.replace(`/workspaces/${workspaceId}`, undefined, {
      shallow: true,
    })
  }, [
    focusShareholderError,
    focusShareholderFetched,
    focusShareholderRow,
    highlightIdFromQuery,
    mapMarkers,
    router,
    shareholdersLoading,
    workspaceId,
    wsId,
  ])

  const debouncedMapUpdate = useMemo(
    () =>
      debounce((target: kakao.maps.Map) => {
        const latlng = target.getCenter()
        const newCenter = {
          lat: latlng.getLat(),
          lng: latlng.getLng(),
        }
        setCurrCenter(newCenter)
        if (wsId) {
          localStorage.setItem(
            getMapStorageKeys(wsId).position,
            JSON.stringify(newCenter),
          )
        }
      }, 500),
    [wsId],
  )

  const handleZoomChange = useCallback(
    (target: kakao.maps.Map) => {
      const currentLevel = target.getLevel()
      if (mapLevel !== currentLevel) {
        setMapLevel(currentLevel)
        if (wsId) {
          localStorage.setItem(
            getMapStorageKeys(wsId).level,
            currentLevel.toString(),
          )
        }
        debouncedMapUpdate(target)
      }
    },
    [debouncedMapUpdate, mapLevel, wsId],
  )

  const handleDragEnd = useCallback(
    (target: kakao.maps.Map) => {
      debouncedMapUpdate(target)
    },
    [debouncedMapUpdate],
  )

  const handleMapClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent("workspace-map-interact"))
  }, [])

  const handleApplyFilters = () => {
    mapMarkersRefetch()
    setIsFilterModalOpen(false)
  }

  const handleReset = useCallback(() => {
    if (
      !window.confirm(
        "필터와 지도 위치를 초기화하고 페이지를 새로고침할까요? 이 작업은 취소할 수 없습니다.",
      )
    ) {
      return
    }
    if (wsId) {
      const keys = getMapStorageKeys(wsId)
      localStorage.setItem(keys.level, "6")
      localStorage.setItem(
        keys.position,
        JSON.stringify({ lat: 37.5665, lng: 126.978 }),
      )
    }
    resetFilters()
    router.reload()
  }, [router, resetFilters, wsId])

  useEffect(() => {
    if (!router.isReady || !wsId || !resolvedWorkspace?.id) return
    ensureWorkspaceScope(wsId)
  }, [router.isReady, wsId, resolvedWorkspace?.id, ensureWorkspaceScope])

  /** 워크스페이스별로 저장된 지도 중심·줌 복원 (전역 키와 분리해 빈 지도 방지) */
  useEffect(() => {
    if (!router.isReady || !wsId) return
    const keys = getMapStorageKeys(wsId)
    const savedLevel = localStorage.getItem(keys.level)
    const savedPosition = localStorage.getItem(keys.position)
    if (savedLevel) {
      const n = parseInt(savedLevel, 10)
      if (!Number.isNaN(n)) setMapLevel(n)
    }
    if (savedPosition) {
      try {
        const p = JSON.parse(savedPosition) as { lat?: unknown; lng?: unknown }
        if (
          typeof p.lat === "number" &&
          typeof p.lng === "number" &&
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng)
        ) {
          setCurrCenter({ lat: p.lat, lng: p.lng })
        }
      } catch {
        void 0
      }
    }
  }, [router.isReady, wsId])

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
    if (isLoading || session) return
    void router.replace(ROUTES.signIn)
  }, [isLoading, router, session])

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

  if (revokedApproval) {
    return (
      <PendingContainer>
        <PendingCard>
          <PendingTitle>이용 권한이 철회되었습니다</PendingTitle>
          <PendingText>
            관리자에 의해 가입 승인이 철회되었습니다. 계속 이용하려면 운영사에
            문의해 주세요.
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
      {userId && visibleListIds.length > 0 && (
        <RulesAcceptanceGate listIds={visibleListIds} userId={userId} />
      )}
      {(isLoading ||
        (shareholdersLoading && shareholderData === undefined)) && (
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
          onClick={handleMapClick}
          onZoomChanged={handleZoomChange}
          onDragEnd={handleDragEnd}>
          <ZoomControl position={"BOTTOMRIGHT"} />
          {mapMarkers.length > 0 && user && (
            <MultipleMapMarker
              markers={mapMarkers}
              highlightShareholderId={highlightShareholderId}
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
              <CloseButton
                type="button"
                onClick={() => setIsVisibleMenu(false)}
                aria-label="대시보드 닫기">
                <ClearIcon sx={{ fontSize: 18 }} />
                닫기
              </CloseButton>
            </MenuHeader>
            <SideMenuScroll>
              <FilterDashboardSummary aria-label="적용 중인 필터 요약">
                <FilterSummaryLabel>필터</FilterSummaryLabel>
                <FilterSummaryChipsWrap>
                  {filterSummaryChips.length === 0 ? (
                    <FilterSummaryEmpty>전체 (조건 없음)</FilterSummaryEmpty>
                  ) : (
                    filterSummaryChips.map((text, i) => (
                      <FilterSummaryChip key={`${text}-${i}`}>
                        {text}
                      </FilterSummaryChip>
                    ))
                  )}
                </FilterSummaryChipsWrap>
              </FilterDashboardSummary>
              <StatsCard
                statsParams={mapStatsParams}
                listsLoading={shareholderListsLoading}
              />
              {hasWorkspace &&
                !shareholderListsLoading &&
                dashboardListIds.length === 0 && (
                  <EmptyWorkspaceHint>
                    이 워크스페이스에 연결된 주주명부가 없습니다. 관리자
                    화면에서 명부를 추가해 주세요.
                  </EmptyWorkspaceHint>
                )}
              {hasWorkspace &&
                !shareholderListsLoading &&
                visibleListIds.length === 0 &&
                dashboardListIds.length > 0 && (
                  <EmptyWorkspaceHint>
                    지도에는 &apos;노출&apos;된 명부만 표시됩니다. 의결권 현황은
                    워크스페이스에 연결된 명부 전체를 집계합니다.
                  </EmptyWorkspaceHint>
                )}
              <MenuHighlightItem onClick={() => setIsFilterModalOpen(true)}>
                <FilterAlt />
                필터 설정
              </MenuHighlightItem>
              <MenuHighlightItem
                onClick={() => {
                  if (wsId)
                    void router.push(`/workspaces/${wsId}/shareholder-search`)
                  setIsVisibleMenu(false)
                }}
                style={
                  wsId
                    ? undefined
                    : { opacity: 0.45, pointerEvents: "none" as const }
                }>
                <SearchIcon />
                주주 검색
              </MenuHighlightItem>
              <MenuItem
                onClick={handleReset}
                style={{ color: COLORS.red[600] }}>
                <RestartAlt />
                초기화
              </MenuItem>
              {hasWorkspace && (
                <MenuItem
                  onClick={async () => {
                    const token = await getAccessToken()
                    if (!token) {
                      toast.error("로그인이 필요합니다.")

                      return
                    }
                    try {
                      const result = await postWorkspaceResourceRequest(
                        token,
                        resolvedWorkspace?.id ?? null,
                      )
                      if (!result.ok) {
                        toast.error(result.message)

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
              <MenuItem
                onClick={() => {
                  if (wsId) void router.push(`/workspaces/${wsId}/activity`)
                }}
                style={
                  wsId
                    ? undefined
                    : { opacity: 0.45, pointerEvents: "none" as const }
                }>
                <ListIcon />
                활동 기록
              </MenuItem>
              {isWorkspaceAdmin && (
                <MenuItem onClick={() => router.push(ROUTES.workspaces)}>
                  <ListIcon />
                  워크스페이스 목록
                </MenuItem>
              )}
              {isWorkspaceAdmin && (
                <MenuItem
                  onClick={() =>
                    router.push(
                      resolvedWorkspace
                        ? `/workspaces/${resolvedWorkspace.id}/admin`
                        : workspace
                          ? `/workspaces/${workspace.id}/admin`
                          : "/admin",
                    )
                  }
                  style={{ color: COLORS.purple[700] }}>
                  <BusinessIcon />
                  워크스페이스 관리
                </MenuItem>
              )}
              {isWorkspaceAdmin && (
                <MenuItem
                  onClick={() =>
                    router.push(
                      isServiceAdmin
                        ? "/admin/integrated"
                        : resolvedWorkspace
                          ? `/workspaces/${resolvedWorkspace.id}/admin`
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
            </SideMenuScroll>
            <SheetHandle aria-hidden />
          </SideMenu>

          <Modal
            open={isFilterModalOpen}
            setOpen={setIsFilterModalOpen}
            position={isMobile ? "bottom" : "center"}>
            <ModalChrome>
              <FilterModalChildren
                modalOpen={isFilterModalOpen}
                handleClose={() => setIsFilterModalOpen(false)}
                handleApplyFilters={handleApplyFilters}
                listIds={visibleListIds.length > 0 ? visibleListIds : null}
                workspaceId={wsId ?? undefined}
              />
            </ModalChrome>
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
  top: max(1rem, env(safe-area-inset-top));
  left: max(1rem, env(safe-area-inset-left));
  z-index: 160;
  background-color: white;
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 12px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background-color: ${COLORS.gray[50]};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 768px) {
    top: max(0.75rem, env(safe-area-inset-top));
    left: max(0.75rem, env(safe-area-inset-left));
  }
`

const MenuOverlay = styled.div<{ isVisible: boolean }>`
  display: ${(p) => (p.isVisible ? "block" : "none")};
  position: fixed;
  inset: 0;
  z-index: 140;
  background: rgba(15, 23, 42, 0.35);
  pointer-events: ${(p) => (p.isVisible ? "auto" : "none")};
  -webkit-tap-highlight-color: transparent;
`

const SideMenu = styled.div<{ isVisible: boolean }>`
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 150;
  width: 100%;
  max-width: 100%;
  max-height: min(92vh, calc(100dvh - env(safe-area-inset-bottom) - 0.5rem));
  height: auto;
  background: white;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
  padding: max(0.5rem, env(safe-area-inset-top))
    max(1.25rem, env(safe-area-inset-right)) 0.5rem
    max(1.25rem, env(safe-area-inset-left));
  border-radius: 0 0 1rem 1rem;
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  visibility: ${(props) => (props.isVisible ? "visible" : "hidden")};
  transform: ${(props) =>
    props.isVisible ? "translateY(0)" : "translateY(-110%)"};
  transition:
    opacity 0.28s ease,
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0.32s;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  pointer-events: ${(props) => (props.isVisible ? "auto" : "none")};
`

const SheetHandle = styled.div`
  flex-shrink: 0;
  width: 2.25rem;
  height: 0.25rem;
  margin: 0.35rem auto 0.15rem;
  border-radius: 999px;
  background: ${COLORS.gray[200]};
`

const SideMenuScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  padding-top: 0.35rem;
`

const FilterDashboardSummary = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${COLORS.gray[50]};
  border: 1px solid ${COLORS.gray[100]};
`

const FilterSummaryLabel = styled.span`
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${COLORS.gray[500]};
  padding-top: 3px;
`

const FilterSummaryChipsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  flex: 1;
`

const FilterSummaryEmpty = styled.span`
  font-size: 0.75rem;
  color: ${COLORS.gray[500]};
  line-height: 1.4;
`

const FilterSummaryChip = styled.span`
  display: inline-block;
  max-width: 100%;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  color: ${COLORS.gray[700]};
  background: white;
  border: 1px solid ${COLORS.gray[200]};
  line-height: 1.3;
  word-break: break-all;
`

const MenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
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
  color: ${COLORS.gray[700]};
  cursor: pointer;
  min-height: 2.75rem;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.9375rem;
  font-weight: 600;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[900]};
  }
`

const MenuItem = styled.div`
  padding: 0.5rem 0.25rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${COLORS.gray[700]};
  margin-top: 2px;
  margin-bottom: 2px;
  min-height: 2.75rem;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${COLORS.gray[50]};
    color: ${COLORS.gray[900]};
  }

  &:active {
    background: ${COLORS.gray[100]};
  }

  svg {
    font-size: 20px;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    min-height: 3rem;
    padding: 0.625rem 0.375rem;
  }
`

const MenuHighlightItem = styled(MenuItem)`
  background: ${COLORS.blue[50]};
  color: ${COLORS.blue[800]};
  font-weight: 600;
  border: 1px solid ${COLORS.blue[100]};
  margin-top: 6px;
  margin-bottom: 4px;

  &:hover {
    background: ${COLORS.blue[100]};
    color: ${COLORS.blue[900]};
  }

  &:active {
    background: ${COLORS.blue[100]};
  }

  svg {
    color: ${COLORS.blue[600]};
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
