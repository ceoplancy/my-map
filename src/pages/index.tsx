import { useEffect, useState, useMemo, useCallback } from "react"
import { Map, MapTypeControl, ZoomControl } from "react-kakao-maps-sdk"
import SearchAddressBounds from "@/component/search-address-bounds"
import { useGetExcel, useGetCompletedFilterMaker } from "@/api/supabase"
import { useGetUserData, usePostSignOut } from "@/api/auth"
import Font from "@/component/font"
import Modal from "@/component/modal"
import GlobalSpinner from "@/component/global-spinner"
import styled from "@emotion/styled"
import FilterModalChildren from "@/component/modal-children/filter-modal-children"

import { useRouter } from "next/router"
import supabase from "@/lib/supabase/supabaseClient"
import Image from "next/image"
import MultipleMapMaker from "@/component/multiple-map-maker"
import { debounce } from "lodash"

const Home = () => {
  const router = useRouter()
  // 유저 정보
  const { data: user } = useGetUserData()

  const [isVisibleMenu, setIsVisibleMenu] = useState(false)
  // 현재 지도 확대 레벨.
  const [mapLevel, setMapLevel] = useState(8)
  // 필터 모달
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  // 주소 검색
  const [searchAddress, setSearchAddress] = useState<{
    keyWord: string
    lat: number
    lng: number
  }>({
    keyWord: "",
    lat: 0,
    lng: 0,
  })
  // 필터 선택
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [companyFilter, setCompanyFilter] = useState<string[]>([])
  const [stocks, setStocks] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  })
  // 현재 위도 경도
  const [currCenter, setCurrCenter] = useState<{ lat: number; lng: number }>({
    lat: 37.5665,
    lng: 126.978,
  })
  // 로그아웃
  const { mutate: logout } = usePostSignOut()
  // 현재 지도 바운드
  const [mapBounds, setMapBounds] = useState<{
    sw: { lat: number; lng: number }
    ne: { lat: number; lng: number }
  }>({
    sw: { lat: 0, lng: 0 },
    ne: { lat: 0, lng: 0 },
  })

  // 엑셀 데이터
  const {
    data: excelData,
    refetch: excelDataRefetch,
    isLoading: excelIsLoading,
  } = useGetExcel(mapLevel, {
    status: statusFilter,
    company: companyFilter,
    startStocks: stocks.start,
    endStocks: stocks.end,
    lat: currCenter.lat,
    lng: currCenter.lng,
    bounds: mapBounds, // 바운드 정보 추가
  })

  // 현재 필터 상황
  const {
    data: completedFilterMakerData,
    refetch: completedFilterMakerDataRefetch,
  } = useGetCompletedFilterMaker(14, {
    status: statusFilter,
    company: companyFilter,
    startStocks: stocks.start,
    endStocks: stocks.end,
  })

  // 지도 이벤트 최적화를 위한 디바운스 적용
  const debouncedMapUpdate = useMemo(
    () =>
      debounce((target: kakao.maps.Map) => {
        const bounds = target.getBounds()
        const latlng = target.getCenter()

        // 한 번에 상태 업데이트
        setCurrCenter({
          lat: latlng.getLat(),
          lng: latlng.getLng(),
        })

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

  // 지도 확대 레벨 트리거 핸들러
  const handleZoomChange = useCallback(
    (target: kakao.maps.Map) => {
      const currentLevel = target.getLevel()
      if (mapLevel !== currentLevel) {
        setMapLevel(currentLevel)
        debouncedMapUpdate(target)
      }
    },
    [debouncedMapUpdate, mapLevel],
  )

  // 지도 드래그 트리거 핸들러
  const handleDragEnd = useCallback(
    (target: kakao.maps.Map) => {
      debouncedMapUpdate(target)
    },
    [debouncedMapUpdate],
  )

  // mapBounds와 mapLevel 변경에 대한 단일 useEffect
  useEffect(() => {
    if (mapBounds.sw.lat !== 0 && mapBounds.sw.lng !== 0) {
      excelDataRefetch()
    }
  }, [mapBounds, mapLevel, excelDataRefetch])

  // 로그아웃 처리
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          router.reload()
        }
      },
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (!excelData || !user?.user.email) return null

  return (
    <>
      {/* 스피너 */}
      {excelIsLoading && (
        <SpinnerFrame>
          <GlobalSpinner
            width={18}
            height={18}
            marginRight={18}
            dotColor="#8536FF"
          />
        </SpinnerFrame>
      )}

      {/* 지도 */}
      <Map
        center={{
          lat: currCenter.lat,
          lng: currCenter.lng,
        }}
        style={{
          width: "100%",
          height: "100vh",
        }}
        level={mapLevel}
        onZoomChanged={handleZoomChange}
        onDragEnd={handleDragEnd}>
        {/* 컨트롤러 생성 */}
        <MapTypeControl position={"TOPRIGHT"} />
        <ZoomControl position={"RIGHT"} />
        {/* 마커 생성 */}
        <MultipleMapMaker markers={excelData} userId={user.user.email} />

        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "20px",
            zIndex: "10",
            backgroundColor: "#fff",
            padding: "5px",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          onClick={() => setIsVisibleMenu(!isVisibleMenu)}>
          <Image src="/svg/menu.svg" alt="menu" width={30} height={30} />
        </div>

        {isVisibleMenu && (
          <>
            {/* 주소 검색 */}
            <SearchAddressBounds
              searchAddress={searchAddress}
              setSearchAddress={setSearchAddress}
            />

            {/* 로그아웃 */}
            <SignOutBtn onClick={() => logout()}>로그아웃</SignOutBtn>

            {/* 필터 버튼 */}
            <FilterBtn onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}>
              필터
            </FilterBtn>

            {/* 필터 현황 */}
            <CompletedStocksWrapper>
              <Font fontSize="13px" margin="0">
                의결권 현황
              </Font>

              <div style={{ border: "0.1px solid #000" }}></div>

              <Font fontSize="13px" margin="0">
                [주주 수] {completedFilterMakerData?.length}
              </Font>

              <Font fontSize="13px">
                [총 주식수] {completedFilterMakerData?.sumCompletedStocks}
              </Font>
            </CompletedStocksWrapper>

            {/* 필터 모달 */}
            <Modal open={isFilterModalOpen} setOpen={setIsFilterModalOpen}>
              <FilterModalChildren
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                companyFilter={companyFilter}
                setCompanyFilter={setCompanyFilter}
                setStocks={setStocks}
                excelDataRefetch={excelDataRefetch}
                completedFilterMakerDataRefetch={
                  completedFilterMakerDataRefetch
                }
                setIsFilterModalOpen={setIsFilterModalOpen}
              />
            </Modal>
          </>
        )}
      </Map>
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

const FilterBtn = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  font-size: 13px;
  font-weight: 700;

  position: fixed;
  left: 100px;
  top: 70px;

  height: 40px;
  padding: 15px;
  border: 1px #000 solid;
  border-radius: 5px;
  background-color: #fff;
  z-index: 5;
  cursor: pointer;
`

const CompletedStocksWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;

  position: fixed;
  left: 20px;
  top: 120px;

  padding: 10px;
  border: 1px #000 solid;
  border-radius: 5px;
  background-color: #fff;
  z-index: 5;
  cursor: pointer;
`

const SignOutBtn = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  font-size: 13px;
  font-weight: 700;

  position: fixed;
  left: 20px;
  top: 70px;

  height: 40px;
  padding: 10px;
  border: 1px #000 solid;
  border-radius: 5px;
  background-color: #fff;
  z-index: 5;
  cursor: pointer;
`
