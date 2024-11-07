import React, { useEffect, useState } from 'react';
import { MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import styled from 'styled-components';
import { usePatchExcel } from '@/api/supabase';
import Font from './font';
import Modal from './modal';
import GlobalSpinner from '@/component/global-spinner';
import Button from './button';
import MakerPatchModalChildren from './modal-children/maker-patch-modal-children';
import DuplicateMakerPatchModalChildren from './modal-children/duplicate-maker-patch-modal-children';
import DuplicateMakerModalChildren from './modal-children/duplicate-maker-modal-children';

const CustomMapMarker = ({ excelData, makerData, userId }) => {
  // 인포윈도우
  const [isOpen, setIsOpen] = useState(false);

  // 마커 업데이트 모달
  const [makerDataUpdateIsModalOpen, setMakerDataUpdateIsModalOpen] =
    useState(false);

  // 중복 항목 모달
  const [duplicateMakerIsModalOpen, setDuplicateMakerIsModalOpen] =
    useState(false);

  // 중복 항목 데이터
  const [duplicateMakerData, setDuplicateMakerData] = useState({});

  // 중복 항목 데이터 변경 상태
  const [duplicateMakerDataState, setDuplicateMakerDataState] = useState(null);

  // 중복 항목 마커 업데이트 모달
  const [duplicateMakerUpdateIsModalOpen, setDuplicateMakerUpdateIsModalOpen] =
    useState(false);

  // 마커 데이터 변경 상태
  const [patchDataState, setPatchDataState] = useState({});

  // 마커 데이터 업데이트
  const { mutate: makerDataMutate, isLoading: makerDataMutateIsLoading } =
    usePatchExcel(makerData.id, userId);

  // 중복 항목 마커 데이터 업데이트
  const {
    mutate: duplicateMakerDataMutate,
    isLoading: duplicateMakerDataMutateIsLoading,
  } = usePatchExcel(duplicateMakerData?.id || '', userId);

  const findDuplicateLocation = () => {
    const result = [];

    excelData?.forEach((x) => {
      if (x.lat === makerData.lat && x.lng === makerData.lng) {
        result.push(x);
      }
    });

    return result;
  };

  // const hashStringToNumber = (str) => {
  //   let hash = 0;
  //   for (let i = 0; i < str.length; i++) {
  //     hash = str.charCodeAt(i) + ((hash << 5) - hash);
  //   }
  //   return Math.abs(hash % 8) + 1; // 1부터 8까지의 숫자로 변환
  // };

  // const getImageSrc = (company) => {
  //   const imageNumber = hashStringToNumber(company);
  //   return `/svg/maker${imageNumber}.svg`;
  // };

  useEffect(() => {
    setPatchDataState(makerData);
  }, [makerData]);

  return (
    <Frame>
      {makerDataMutateIsLoading && (
        <SpinnerFrame>
          <GlobalSpinner
            width={18}
            height={18}
            marginRight={18}
            dotColor="#8536FF"
          />
        </SpinnerFrame>
      )}

      {duplicateMakerDataMutateIsLoading && (
        <SpinnerFrame>
          <GlobalSpinner
            width={18}
            height={18}
            marginRight={18}
            dotColor="#8536FF"
          />
        </SpinnerFrame>
      )}

      {/* 마커 데이터 수정하기 모달 */}
      <Modal
        state={makerDataUpdateIsModalOpen}
        setState={setMakerDataUpdateIsModalOpen}
      >
        <MakerPatchModalChildren
          makerData={makerData}
          patchDataState={patchDataState}
          setPatchDataState={setPatchDataState}
          makerDataMutate={makerDataMutate}
        />
      </Modal>

      {/* 중복 항목 마커 데이터 수정하기 모달 */}
      <Modal
        state={duplicateMakerUpdateIsModalOpen}
        setState={setDuplicateMakerUpdateIsModalOpen}
      >
        <DuplicateMakerPatchModalChildren
          duplicateMakerData={duplicateMakerData}
          setDuplicateMakerData={setDuplicateMakerData}
          duplicateMakerDataState={duplicateMakerDataState}
          setDuplicateMakerDataState={setDuplicateMakerDataState}
          duplicateMakerDataMutate={duplicateMakerDataMutate}
          userId={userId}
        />
      </Modal>

      {/* 중복 항목 목록 마커 모달 */}
      <Modal
        state={duplicateMakerIsModalOpen}
        setState={setDuplicateMakerIsModalOpen}
      >
        <DuplicateMakerModalChildren
          findDuplicateLocation={findDuplicateLocation}
          setDuplicateMakerData={setDuplicateMakerData}
          setDuplicateMakerDataState={setDuplicateMakerDataState}
          duplicateMakerUpdateIsModalOpen={duplicateMakerUpdateIsModalOpen}
          setDuplicateMakerUpdateIsModalOpen={
            setDuplicateMakerUpdateIsModalOpen
          }
          duplicateMakerIsModalOpen={duplicateMakerIsModalOpen}
          setDuplicateMakerIsModalOpen={setDuplicateMakerIsModalOpen}
        />
      </Modal>

      {/* 마커 */}
      <MapMarker
        position={{
          lat: `${makerData.lat}`,
          lng: `${makerData.lng}`,
        }}
        clickable={true}
        onClick={() => {
          if (findDuplicateLocation()?.length >= 2) {
            setDuplicateMakerIsModalOpen(!duplicateMakerIsModalOpen);
          } else {
            setIsOpen(!isOpen);
          }
        }}
        image={{
          src: `/svg/${makerData.maker}.svg`,
          // src: getImageSrc(makerData.company),
          size: {
            width: 30,
            height: 40,
          },
          // options: {
          //   offset: {
          //     x: 20,
          //     y: 69,
          //   },
          // },
        }}
      >
        {/* 인포윈도우 */}
        {isOpen && (
          <CustomOverlayMap
            position={{
              lat: `${makerData.lat}`,
              lng: `${makerData.lng}`,
            }}
            clickable={true}
            yAnchor={1.08}
            zIndex={100}
          >
            <InfoWindow>
              <CloseBtn
                alt="close"
                src="/svg/close.svg"
                onClick={() => setIsOpen(false)}
              />

              <table
                style={{
                  border: '1px solid #ccc',
                  borderCollapse: 'collapse',
                  width: '100%',
                }}
              >
                <tbody>
                  <tr style={{ border: '1px solid #ccc' }}>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      주주번호
                    </td>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {makerData.id}
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #ccc' }}>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      이름
                    </td>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {makerData.name}
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #ccc' }}>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      주식수
                    </td>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {makerData.stocks}
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #ccc' }}>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      주소
                    </td>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.4,
                      }}
                    >
                      {makerData.address}
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #ccc' }}>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      상태
                    </td>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {makerData.status}
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #ccc' }}>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      회사명
                    </td>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {makerData.company}
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #ccc' }}>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      메모
                    </td>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {makerData.memo}
                    </td>
                  </tr>
                  <tr style={{ border: '1px solid #ccc' }}>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      변경이력
                    </td>
                    <td
                      style={{
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        padding: '10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.3rem',
                        }}
                      >
                        {makerData.history !== null &&
                          makerData.history.map((x) => {
                            return (
                              <Font key={x} fontSize="13px">
                                {x}
                              </Font>
                            );
                          })}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '3rem' }}>
                <Button
                  fontSize="14px"
                  margin="0 auto"
                  backgroundColor="#5599FF"
                  border="1px solid #5599FF"
                  borderRadius="5px"
                  color="#fff"
                  onClick={() => setMakerDataUpdateIsModalOpen(patchDataState)}
                >
                  수정하기
                </Button>
              </div>
            </InfoWindow>
          </CustomOverlayMap>
        )}
      </MapMarker>
    </Frame>
  );
};

export default CustomMapMarker;

const Frame = styled.div``;

const InfoWindow = styled.div`
  width: 300px;
  padding: 30px 15px;
  background-color: #fff;
  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
  border-radius: 5px;
`;

const CloseBtn = styled.img`
  width: 15px;
  height: 15px;
  position: absolute;
  right: 10px;
  top: 10px;
  cursor: pointer;
`;

const SpinnerFrame = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.5);
`;
