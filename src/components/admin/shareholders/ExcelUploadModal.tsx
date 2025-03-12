import styled from "styled-components"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import { useQueryClient } from "react-query"
import supabaseAdmin from "@/lib/supabase/supabaseAdminClient"
import * as XLSX from "xlsx"

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const Modal = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 32rem;
  box-shadow: var(--shadow-lg);
`

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  margin-bottom: 1.5rem;
`

const UploadArea = styled.div`
  border: 2px dashed ${COLORS.gray[300]};
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${COLORS.blue[500]};
    background: ${COLORS.blue[50]};
  }
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
`

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &.cancel {
    color: ${COLORS.gray[600]};
    background: ${COLORS.gray[100]};

    &:hover {
      background: ${COLORS.gray[200]};
    }
  }

  &.upload {
    color: white;
    background: ${COLORS.blue[500]};

    &:hover {
      background: ${COLORS.blue[600]};
    }
  }
`

interface Props {
  onClose: () => void
}

export default function ExcelUploadModal({ onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const queryClient = useQueryClient()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFile(file)
    }
  }

  const processExcel = async () => {
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      //   const { error } = await supabase.from("excel").insert(jsonData)

      //   if (error) throw error

      queryClient.invalidateQueries(["excel"])
      alert("엑셀 데이터가 성공적으로 업로드되었습니다.")
      onClose()
    } catch (error) {
      console.error("Error uploading excel:", error)
      alert("엑셀 업로드 중 오류가 발생했습니다.")
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>엑셀 파일 업로드</Title>
        <UploadArea>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: "none" }}
            id="excel-upload"
          />
          <label htmlFor="excel-upload">
            {file ? file.name : "클릭하여 엑셀 파일을 선택하세요"}
          </label>
        </UploadArea>
        <ButtonGroup>
          <Button className="cancel" onClick={onClose}>
            취소
          </Button>
          <Button className="upload" onClick={processExcel} disabled={!file}>
            업로드
          </Button>
        </ButtonGroup>
      </Modal>
    </Overlay>
  )
}
