import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import { useQueryClient } from "react-query"
import supabaseAdmin from "@/lib/supabase/supabaseAdminClient"
import { Excel } from "@/types/excel"
import { toast } from "react-toastify"

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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Label = styled.label`
  font-weight: 500;
  color: ${COLORS.gray[700]};
`

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 1rem;

  &:focus {
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 1rem;

  &:focus {
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

  &.save {
    color: white;
    background: ${COLORS.blue[500]};

    &:hover {
      background: ${COLORS.blue[600]};
    }
  }
`

interface Props {
  data: Excel
  onClose: () => void
}

export default function EditShareholderModal({ data, onClose }: Props) {
  const [formData, setFormData] = useState(data)
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabaseAdmin
        .from("excel")
        .update(formData)
        .eq("id", data.id)

      if (error) throw error

      queryClient.invalidateQueries(["excel"])
      toast.success("데이터가 성공적으로 수정되었습니다.")
      onClose()
    } catch (error) {
      console.error("Error updating data:", error)
      toast.error("데이터 수정 중 오류가 발생했습니다.")
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>주주 정보 수정</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>회사명</Label>
            <Input
              type="text"
              value={formData.company || ""}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label>상태</Label>
            <Select
              value={formData.status || ""}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }>
              <option value="접수">접수</option>
              <option value="진행중">진행중</option>
              <option value="완료">완료</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>주식수</Label>
            <Input
              type="number"
              value={formData.stocks}
              onChange={(e) =>
                setFormData({ ...formData, stocks: Number(e.target.value) })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label>메모</Label>
            <Input
              type="text"
              value={formData.memo || ""}
              onChange={(e) =>
                setFormData({ ...formData, memo: e.target.value })
              }
            />
          </FormGroup>
          <ButtonGroup>
            <Button type="button" className="cancel" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" className="save">
              저장
            </Button>
          </ButtonGroup>
        </Form>
      </Modal>
    </Overlay>
  )
}
