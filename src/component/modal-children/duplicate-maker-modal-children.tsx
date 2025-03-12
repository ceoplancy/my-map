import { Excel } from "@/types/excel"
import Button from "../button"
import { Dispatch, SetStateAction } from "react"

interface DuplicateMakerModalChildrenProps {
  findDuplicateLocation: () => Excel[]
  setDuplicateMakerData: Dispatch<SetStateAction<Excel | null>>
  setDuplicateMakerDataState: Dispatch<SetStateAction<Excel | null>>
  duplicateMakerUpdateIsModalOpen: boolean
  setDuplicateMakerUpdateIsModalOpen: Dispatch<SetStateAction<boolean>>
  duplicateMakerIsModalOpen: boolean
  setDuplicateMakerIsModalOpen: Dispatch<SetStateAction<boolean>>
}

const DuplicateMakerModalChildren = ({
  findDuplicateLocation, // 중복 마커 찾기 함수
  setDuplicateMakerData, // 현재 중복 마커 데이터 setState
  setDuplicateMakerDataState, // 중복 마커 데이터 update setState
  duplicateMakerUpdateIsModalOpen, // 중복 마커 데이터 update state
  setDuplicateMakerUpdateIsModalOpen, // 중복 마커 데이터 update setState
  duplicateMakerIsModalOpen, // 중복 마커 모달 열기/닫기 state
  setDuplicateMakerIsModalOpen, // 중복 마커 모달 열기/닫기 setState
}: DuplicateMakerModalChildrenProps) => {
  return (
    <div style={{ width: "100%" }}>
      {findDuplicateLocation()?.map((x) => {
        return (
          <Button
            key={x.id}
            width="100%"
            fontSize="14px"
            lineHeight={"1.2"}
            margin="1.5rem 0 0 0"
            onClick={() => {
              // 데이터 바인딩
              setDuplicateMakerData(x)
              // 수정 모달 열기
              setDuplicateMakerUpdateIsModalOpen(
                !duplicateMakerUpdateIsModalOpen,
              )
              // 중복 항목 모달 닫기
              setDuplicateMakerIsModalOpen(!duplicateMakerIsModalOpen)
              // 중복 항목 변경 상태 초기화
              setDuplicateMakerDataState(null)
            }}>
            {x.name} / {x.address}
          </Button>
        )
      })}
    </div>
  )
}

export default DuplicateMakerModalChildren
