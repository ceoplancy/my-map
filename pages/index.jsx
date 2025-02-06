import React, { useEffect, useState } from 'react';
import { Map, MapTypeControl, ZoomControl } from 'react-kakao-maps-sdk';
import SearchAddressBounds from '@/component/search-address-bounds';
import CustomMapMarker from '@/component/custom-map-maker';
import { useGetExcel, useGetCompletedFilterMaker } from '@/api/supabase';
import { useGetUserData, usePostSignOut } from '@/api/auth';
import Font from '@/component/font';
import Modal from '@/component/modal';
import GlobalSpinner from '@/component/global-spinner';
import styled from 'styled-components';
import FilterModalChildren from '@/component/modal-children/filter-modal-children';
import { toastStateAtom } from 'atoms';
import { useRecoilState } from 'recoil';
import { useRouter } from 'next/router';
import supabase from '@/config/supabaseClient';
import withAuth from '@/hoc/withAuth';
import Image from 'next/image';
import MultipleMapMaker from '@/component/multiple-map-maker';

const Home = () => {
  const router = useRouter();
  const [toastState, setToastState] = useRecoilState(toastStateAtom);
  const [isVisibleMenu, setIsVisibleMenu] = useState(false);

  // 현재 지도 확대 레벨.
  const [mapLevel, setMapLevel] = useState(4);

  // 필터 모달
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // 주소 검색
  const [searchAddress, setSearchAddress] = useState({
    keyWord: '',
    lat: '',
    lng: '',
  });

  // 필터 선택
  const [statusFilter, setStatusFilter] = useState([]);
  const [companyFilter, setCompanyFilter] = useState([]);
  const [stocks, setStocks] = useState({
    start: '',
    end: '',
  });

  // 현재 위도 경도
  const [currCenter, setCurrCenter] = useState({ lat: 37.5665, lng: 126.978 });

  // 유저 정보
  const { data: user } = useGetUserData(setToastState, router);

  // 로그아웃
  const { mutate } = usePostSignOut(setToastState);

  // 엑셀 데이터
  const {
    data: excelData,
    refetch: excelDataRefetch,
    isLoading: excelIsLoading,
  } = useGetExcel(
    {
      status: statusFilter,
      company: companyFilter,
      startStocks: stocks.start,
      endStocks: stocks.end,
      lat: currCenter.lat,
      lng: currCenter.lng,
    },
    mapLevel
  );

  // 현재 필터 상황
  const {
    data: completedFilterMakerData,
    refetch: completedFilterMakerDataRefetch,
  } = useGetCompletedFilterMaker({
    status: statusFilter,
    company: companyFilter,
    startStocks: stocks.start,
    endStocks: stocks.end,
  });

  // 지도 확대 레벨 트리거 핸들러
  const handleZoomChange = (map) => {
    const currentLevel = map.getLevel();
    setMapLevel(currentLevel);
  };

  // 지도 드래그 트리거 핸들러
  const handleDragEnd = (map) => {
    const latlng = map.getCenter();
    const lat = latlng.getLat();
    const lng = latlng.getLng();
    setCurrCenter({ lat, lng });
  };

  // 지도 드래그, 확대 레벨 트리거
  useEffect(() => {
    excelDataRefetch();
  }, [currCenter, mapLevel]);

  // 로그아웃 처리
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.reload();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const groupExcelData = (data) => {
    return data?.reduce((acc, curr, index) => {
      if (index % 10 === 0) acc.push([]);
      acc[acc.length - 1].push(curr);
      return acc;
    }, []);
  };

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
          lat: 37.552839406975586,
          lng: 126.97228481049244,
        }}
        style={{
          width: '100%',
          height: '100vh',
        }}
        level={mapLevel}
        onZoomChanged={handleZoomChange}
        onDragEnd={handleDragEnd}
      >
        {/* 컨트롤러 생성 */}
        <MapTypeControl position={'TOPRIGHT'} />
        <ZoomControl position={'RIGHT'} />

        {/* 마커 생성 */}
        {mapLevel > 7
          ? groupExcelData(excelData).map((group, groupIndex) => {
              return (
                <MultipleMapMaker key={`group-${groupIndex}`} markers={group} />
              );
            })
          : excelData?.map((x) => (
              <CustomMapMarker
                key={x.id}
                excelData={excelData}
                userId={user && user.user?.email}
                makerData={x}
              />
            ))}

        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: '10',
            backgroundColor: '#fff',
            padding: '5px',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
          onClick={() => setIsVisibleMenu(!isVisibleMenu)}
        >
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
            <SignOutBtn onClick={() => mutate()}>로그아웃</SignOutBtn>

            {/* 필터 버튼 */}
            <FilterBtn onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}>
              필터
            </FilterBtn>

            {/* 필터 현황 */}
            <CompletedStocksWrapper>
              <Font fontSize="13px" margin="0">
                의결권 현황
              </Font>

              <div style={{ border: '0.1px solid #000' }}></div>

              <Font fontSize="13px" margin="0">
                [주주 수] {completedFilterMakerData?.length}
              </Font>

              <Font fontSize="13px">
                [총 주식수] {completedFilterMakerData?.sumCompletedStocks}
              </Font>
            </CompletedStocksWrapper>

            {/* 필터 모달 */}
            <Modal state={isFilterModalOpen} setState={setIsFilterModalOpen}>
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
  );
};

export default withAuth(Home);

const SpinnerFrame = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.5);
`;

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
`;

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
`;

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
`;
