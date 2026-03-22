import styled from "@emotion/styled"
import { Excel } from "@/types/excel"
import { usePatchExcel } from "@/api/supabase"
import ExcelDataTable from "./excel-data-table"
import Modal from "./modal"
import MakerPatchModalChildren from "./modal-children/maker-patch-modal-children"
import { useState } from "react"
import { toast } from "react-toastify"
import { ContentCopy, Edit, Close } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"

interface InfoPanelProps {
  marker: Excel
  onClose: () => void
}

const InfoPanel = ({ marker, onClose }: InfoPanelProps) => {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const { mutate: makerDataMutate } = usePatchExcel()

  const handleAddressCopy = () => {
    navigator.clipboard.writeText(marker.address ?? "")
    toast.success("주소가 클립보드에 복사되었습니다")
  }

  return (
    <>
      <PanelContainer onClick={(e) => e.stopPropagation()}>
        <PanelHeader>
          <HeaderTitle>주주 정보</HeaderTitle>
          <CloseBtn onClick={onClose}>
            <Close fontSize="small" />
          </CloseBtn>
        </PanelHeader>

        <PanelBody>
          <ExcelDataTable data={marker} />
        </PanelBody>

        <PanelFooter>
          <ActionButton variant="success" onClick={handleAddressCopy}>
            <ContentCopy fontSize="small" />
            <span>주소 복사</span>
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={() => setEditModalOpen(true)}>
            <Edit fontSize="small" />
            <span>수정하기</span>
          </ActionButton>
          <ActionButton variant="close" onClick={onClose}>
            <Close fontSize="small" />
            <span>닫기</span>
          </ActionButton>
        </PanelFooter>
      </PanelContainer>

      <Modal position="center" open={editModalOpen} setOpen={setEditModalOpen}>
        <MakerPatchModalChildren
          makerData={marker}
          makerDataMutate={makerDataMutate}
          setMakerDataUpdateIsModalOpen={setEditModalOpen}
        />
      </Modal>
    </>
  )
}

export default InfoPanel

const PanelContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  width: 420px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;

  @media (max-width: 480px) {
    width: 300px;
  }
`

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid ${COLORS.gray[100]};
  flex-shrink: 0;
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`

const PanelBody = styled.div`
  padding: 16px;
  overflow-y: auto;
  max-height: 400px;
`

const PanelFooter = styled.div`
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid ${COLORS.gray[100]};
  flex-shrink: 0;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 6px;
  }
`

const ActionButton = styled.button<{
  variant: "success" | "primary" | "close"
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  min-height: 36px;
  flex: 1;
  transition: opacity 0.15s;

  background-color: ${({ variant }) =>
    variant === "success"
      ? COLORS.green[600]
      : variant === "primary"
        ? COLORS.blue[600]
        : COLORS.gray[500]};
  color: white;

  &:hover {
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    font-size: 13px;
    padding: 6px 10px;
  }
`

const CloseBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${COLORS.gray[500]};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;

  &:hover {
    color: ${COLORS.gray[700]};
    background: ${COLORS.gray[100]};
  }
`
