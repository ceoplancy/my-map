import React, { useEffect, useState } from "react"
import { MapMarker, CustomOverlayMap } from "react-kakao-maps-sdk"
import styled from "styled-components"
import { usePatchExcel } from "@/api/supabase"
import Modal from "./modal"
import GlobalSpinner from "@/component/global-spinner"
import Button from "./button"
import MakerPatchModalChildren from "./modal-children/maker-patch-modal-children"
import DuplicateMakerPatchModalChildren from "./modal-children/duplicate-maker-patch-modal-children"
import DuplicateMakerModalChildren from "./modal-children/duplicate-maker-modal-children"
import ExcelDataTable from "./excel-data-table"

const CustomMapMarker = React.memo(({ excelData, makerData, userId }) => {
  // 인포윈도우
  const [isOpen, setIsOpen] = useState(false)

  // 마커 업데이트 모달
  const [makerDataUpdateIsModalOpen, setMakerDataUpdateIsModalOpen] =
    useState(false)

  // 중복 항목 모달
  const [duplicateMakerIsModalOpen, setDuplicateMakerIsModalOpen] =
    useState(false)

  // 중복 항목 데이터
  const [duplicateMakerData, setDuplicateMakerData] = useState({})

  // 중복 항목 데이터 변경 상태
  const [duplicateMakerDataState, setDuplicateMakerDataState] = useState(null)

  // 중복 항목 마커 업데이트 모달
  const [duplicateMakerUpdateIsModalOpen, setDuplicateMakerUpdateIsModalOpen] =
    useState(false)

  // 마커 데이터 변경 상태
  const [patchDataState, setPatchDataState] = useState({})

  // 마커 데이터 업데이트
  const { mutate: makerDataMutate, isLoading: makerDataMutateIsLoading } =
    usePatchExcel(makerData.id, userId)

  // 중복 항목 마커 데이터 업데이트
  const {
    mutate: duplicateMakerDataMutate,
    isLoading: duplicateMakerDataMutateIsLoading,
  } = usePatchExcel(duplicateMakerData?.id || "", userId)

  const findDuplicateLocation = () => {
    const result = []

    excelData?.forEach((x) => {
      if (x.lat === makerData.lat && x.lng === makerData.lng) {
        result.push(x)
      }
    })

    return result
  }

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
    setPatchDataState(makerData)
  }, [makerData])

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
        setState={setMakerDataUpdateIsModalOpen}>
        <MakerPatchModalChildren
          makerData={makerData}
          patchDataState={patchDataState}
          setPatchDataState={setPatchDataState}
          makerDataMutate={makerDataMutate}
          setMakerDataUpdateIsModalOpen={setMakerDataUpdateIsModalOpen}
        />
      </Modal>

      {/* 중복 항목 마커 데이터 수정하기 모달 */}
      <Modal
        state={duplicateMakerUpdateIsModalOpen}
        setState={setDuplicateMakerUpdateIsModalOpen}>
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
        setState={setDuplicateMakerIsModalOpen}>
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

      <MapMarker
        position={{
          lat: `${makerData.lat}`,
          lng: `${makerData.lng}`,
        }}
        clickable={true}
        onClick={() => {
          if (findDuplicateLocation()?.length >= 2) {
            setDuplicateMakerIsModalOpen(!duplicateMakerIsModalOpen)
          } else {
            setIsOpen(!isOpen)
          }
        }}
        image={{
          src: `/svg/${makerData.maker}.svg`,
          size: {
            width: 30,
            height: 40,
          },
        }}>
        {/* 인포윈도우 */}
        {isOpen && (
          <CustomOverlayMap
            position={{
              lat: `${makerData.lat}`,
              lng: `${makerData.lng}`,
            }}
            clickable={true}
            yAnchor={1.1}
            zIndex={100}>
            <InfoWindow>
              <ExcelDataTable data={makerData} />

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  marginTop: "3rem",
                }}>
                <Button
                  fontSize="14px"
                  backgroundColor="#5599FF"
                  border="1px solid #5599FF"
                  borderRadius="5px"
                  color="#fff"
                  onClick={() => setMakerDataUpdateIsModalOpen(patchDataState)}>
                  수정하기
                </Button>

                <Button
                  fontSize="14px"
                  backgroundColor="#fff"
                  border="1px solid #000"
                  borderRadius="5px"
                  onClick={() => setIsOpen(false)}>
                  닫기
                </Button>
              </div>
            </InfoWindow>
          </CustomOverlayMap>
        )}
      </MapMarker>
    </Frame>
  )
})

export default CustomMapMarker

const Frame = styled.div``

const InfoWindow = styled.div`
  width: 50rem;
  max-height: 50rem;
  overflow-y: auto;

  padding: 20px;
  background-color: #fff;
  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
  border-radius: 5px;
`

const SpinnerFrame = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.5);
`
