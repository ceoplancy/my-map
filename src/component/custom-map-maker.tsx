import { usePatchExcel } from "@/api/supabase"
import { useState } from "react"
import { CustomOverlayMap, MapMarker } from "react-kakao-maps-sdk"
import styled from "styled-components"
import { Excel } from "@/types/excel"
import Modal from "./modal"
import DuplicateMakerModalChildren from "./modal-children/duplicate-maker-modal-children"
import DuplicateMakerPatchModalChildren from "./modal-children/duplicate-maker-patch-modal-children"
import MakerPatchModalChildren from "./modal-children/maker-patch-modal-children"
import ExcelDataTable from "./excel-data-table"
import Button from "./button"
import GlobalSpinner from "./global-spinner"

interface CustomMapMakerProps {
  marker: Excel
  userId: string
}

const CustomMapMaker = ({ marker, userId }: CustomMapMakerProps) => {
  // 인포윈도우
  const [isOpen, setIsOpen] = useState(false)
  // 마커 업데이트 모달
  const [makerDataUpdateIsModalOpen, setMakerDataUpdateIsModalOpen] =
    useState(false)
  // 중복 항목 모달
  const [duplicateMakerIsModalOpen, setDuplicateMakerIsModalOpen] =
    useState(false)
  // 중복 항목 데이터
  const [duplicateMakerData, setDuplicateMakerData] = useState<Excel | null>(
    null,
  )
  // 중복 항목 데이터 변경 상태
  const [duplicateMakerDataState, setDuplicateMakerDataState] =
    useState<Excel | null>(null)
  // 중복 항목 마커 업데이트 모달
  const [duplicateMakerUpdateIsModalOpen, setDuplicateMakerUpdateIsModalOpen] =
    useState(false)

  // 마커 데이터 변경 상태
  const [patchDataState, setPatchDataState] = useState<Excel | null>(null)

  // 마커 데이터 업데이트
  const { mutate: makerDataMutate, isLoading: makerDataMutateIsLoading } =
    usePatchExcel(userId)

  // 중복 항목 마커 데이터 업데이트
  const {
    mutate: duplicateMakerDataMutate,
    isLoading: duplicateMakerDataMutateIsLoading,
  } = usePatchExcel(userId)

  if (!marker) return null

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

      <MapMarker
        position={{
          lat: marker.lat || 0,
          lng: marker.lng || 0,
        }}
        clickable={true}
        onClick={() => {
          console.info(marker)
          setIsOpen(!isOpen)
        }}
        image={{
          src: `/svg/google-map-marker.svg`,
          size: {
            width: 30,
            height: 40,
          },
        }}
      />
      {/* 인포윈도우 */}
      {isOpen && (
        <CustomOverlayMap
          position={{
            lat: marker.lat || 0,
            lng: marker.lng || 0,
          }}
          clickable={true}
          yAnchor={1.1}
          zIndex={100}>
          <InfoWindow>
            <ExcelDataTable data={marker} />

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
                onClick={() => setMakerDataUpdateIsModalOpen(true)}>
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
      {/* 마커 데이터 수정하기 모달 */}
      <Modal
        open={makerDataUpdateIsModalOpen}
        setOpen={setMakerDataUpdateIsModalOpen}>
        <MakerPatchModalChildren
          makerData={marker}
          makerDataMutate={makerDataMutate}
          setMakerDataUpdateIsModalOpen={setMakerDataUpdateIsModalOpen}
        />
      </Modal>
      {/* 중복 항목 마커 데이터 수정하기 모달 */}
      <Modal
        open={duplicateMakerUpdateIsModalOpen}
        setOpen={setDuplicateMakerUpdateIsModalOpen}>
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
        open={duplicateMakerIsModalOpen}
        setOpen={setDuplicateMakerIsModalOpen}>
        <DuplicateMakerModalChildren
          findDuplicateLocation={() => []}
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
    </Frame>
  )
}

export default CustomMapMaker

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
