import { usePatchExcel } from "@/api/supabase"
import { useEffect, useState } from "react"
import { CustomOverlayMap, MapMarker } from "react-kakao-maps-sdk"
import styled from "@emotion/styled"
import { Excel } from "@/types/excel"
import Modal from "./modal"
import MakerPatchModalChildren from "./modal-children/maker-patch-modal-children"
import ExcelDataTable from "./excel-data-table"
import GlobalSpinner from "./global-spinner"
import Portal from "./portal"
import { toast } from "react-toastify"
import { ContentCopy, Edit, Close } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"

interface CustomMapMakerProps {
  marker: Excel
}

const CustomMapMaker = ({ marker }: CustomMapMakerProps) => {
  // 인포윈도우
  const [isOpen, setIsOpen] = useState(false)
  // 마커 업데이트 모달
  const [makerDataUpdateIsModalOpen, setMakerDataUpdateIsModalOpen] =
    useState(false)

  const { mutate: makerDataMutate, isLoading: makerDataMutateIsLoading } =
    usePatchExcel()

  const handleAddressCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    navigator.clipboard.writeText(marker.address ?? "")
    toast.success("주소가 클립보드에 복사되었습니다")
  }

  useEffect(() => {
    return () => {
      setIsOpen(false)
      setMakerDataUpdateIsModalOpen(false)
    }
  }, [])

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
      <MapMarker
        position={{
          lat: marker.lat || 0,
          lng: marker.lng || 0,
        }}
        clickable={true}
        onClick={() => {
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
        <Portal>
          <CustomOverlayMap
            position={{
              lat: marker.lat || 0,
              lng: marker.lng || 0,
            }}
            clickable={true}
            yAnchor={1.1}
            zIndex={100}>
            <InfoWindowContainer>
              <InfoWindowHeader>
                <HeaderTitle>주주 정보</HeaderTitle>
                <CloseButton onClick={() => setIsOpen(false)}>
                  <Close fontSize="small" />
                </CloseButton>
              </InfoWindowHeader>

              <ExcelDataTable data={marker} />

              <InfoWindowFooter>
                <ActionButton variant="success" onClick={handleAddressCopy}>
                  <ContentCopy fontSize="small" />
                  주소 복사
                </ActionButton>
                <ActionButton
                  variant="primary"
                  onClick={() => setMakerDataUpdateIsModalOpen(true)}>
                  <Edit fontSize="small" />
                  수정하기
                </ActionButton>
              </InfoWindowFooter>
            </InfoWindowContainer>
          </CustomOverlayMap>
        </Portal>
      )}
      {/* 마커 데이터 수정하기 모달 */}
      <Modal
        position="center"
        open={makerDataUpdateIsModalOpen}
        setOpen={setMakerDataUpdateIsModalOpen}>
        <MakerPatchModalChildren
          makerData={marker}
          makerDataMutate={makerDataMutate}
          setMakerDataUpdateIsModalOpen={setMakerDataUpdateIsModalOpen}
        />
      </Modal>
    </Frame>
  )
}

export default CustomMapMaker

const Frame = styled.div``

const InfoWindowContainer = styled.div`
  min-width: 280px;
  height: 100%;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  user-select: none;
  backdrop-filter: blur(8px);
  border: 1px solid ${COLORS.gray[100]};
  transform-origin: bottom center;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 1920px) {
    width: 600px;
  }
  @media (max-width: 600px) {
    width: 400px;
  }
  @media (max-width: 450px) {
    width: 280px;
  }
`

const InfoWindowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid ${COLORS.gray[100]};
`

const HeaderTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${COLORS.gray[900]};
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "";
    display: block;
    width: 4px;
    height: 16px;
    background: ${COLORS.blue[500]};
    border-radius: 2px;
  }
`

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  border-radius: 8px;
  color: ${COLORS.gray[500]};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
    transform: rotate(90deg);
  }
`

const InfoWindowContent = styled.div`
  padding: 0;
  scroll-behavior: smooth;
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${COLORS.gray[200]};
    border-radius: 3px;

    &:hover {
      background: ${COLORS.gray[300]};
    }
  }
`

const InfoWindowFooter = styled.div`
  display: flex;
  justify-content: end;
  gap: 12px;
  padding: 20px 24px;
  background: ${COLORS.gray[50]};
  border-top: 1px solid ${COLORS.gray[100]};
`

const ActionButton = styled.button<{ variant: "primary" | "success" }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${({ variant }) =>
    variant === "primary"
      ? COLORS.blue[500]
      : variant === "success"
        ? COLORS.green[500]
        : "white"};
  color: white;
  box-shadow: 0 2px 4px
    ${({ variant }) =>
      variant === "primary"
        ? "rgba(59, 130, 246, 0.2)"
        : variant === "success"
          ? "rgba(76, 175, 80, 0.2)"
          : "rgba(0, 0, 0, 0.1)"};

  &:hover {
    background: ${({ variant }) =>
      variant === "primary"
        ? COLORS.blue[600]
        : variant === "success"
          ? COLORS.green[600]
          : COLORS.gray[100]};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px
      ${({ variant }) =>
        variant === "primary"
          ? "rgba(59, 130, 246, 0.3)"
          : variant === "success"
            ? "rgba(76, 175, 80, 0.3)"
            : "rgba(0, 0, 0, 0.15)"};
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px
      ${({ variant }) =>
        variant === "primary"
          ? "rgba(59, 130, 246, 0.2)"
          : variant === "success"
            ? "rgba(76, 175, 80, 0.2)"
            : "rgba(0, 0, 0, 0.1)"};
  }

  svg {
    font-size: 18px;
  }
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
