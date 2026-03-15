import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import { reportError } from "@/lib/reportError"
import {
  useCreateShareholder,
  type CreateShareholderInput,
} from "@/api/workspace"
import { FIELD_LABELS } from "./EditShareholderModal"

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
  z-index: 100;
`

const Modal = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 36rem;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
`

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  margin-bottom: 1.5rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`

const Label = styled.label`
  font-weight: 500;
  font-size: 0.875rem;
  color: ${COLORS.gray[700]};
`

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1rem;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
  }
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
`

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &.cancel {
    color: ${COLORS.gray[600]};
    background: ${COLORS.gray[100]};
    border: none;

    &:hover {
      background: ${COLORS.gray[200]};
    }
  }

  &.save {
    color: white;
    background: ${COLORS.blue[500]};
    border: none;

    &:hover {
      background: ${COLORS.blue[600]};
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

interface Props {
  listId: string
  onClose: () => void
  onSuccess?: () => void
}

const defaultForm: Omit<CreateShareholderInput, "list_id"> = {
  name: null,
  company: null,
  address: null,
  status: "미방문",
  stocks: 0,
  memo: null,
  maker: null,
}

export default function AddShareholderModal({
  listId,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState(defaultForm)
  const createShareholder = useCreateShareholder()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createShareholder.mutateAsync({
        list_id: listId,
        ...form,
      })
      setForm(defaultForm)
      onSuccess?.()
      onClose()
    } catch (error) {
      reportError(error, {
        toastMessage: "주주 추가 중 오류가 발생했습니다.",
      })
    }
  }

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>주주 추가</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>{FIELD_LABELS.name}</Label>
            <Input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => update("name", e.target.value || null)}
              placeholder="이름"
            />
          </FormGroup>
          <FormGroup>
            <Label>{FIELD_LABELS.company}</Label>
            <Input
              type="text"
              value={form.company ?? ""}
              onChange={(e) => update("company", e.target.value || null)}
              placeholder="회사명(구분1)"
            />
          </FormGroup>
          <FormGroup>
            <Label>{FIELD_LABELS.address}</Label>
            <Input
              type="text"
              value={form.address ?? ""}
              onChange={(e) => update("address", e.target.value || null)}
              placeholder="주소"
            />
          </FormGroup>
          <FormGroup>
            <Label>{FIELD_LABELS.status}</Label>
            <Select
              value={form.status ?? "미방문"}
              onChange={(e) =>
                update(
                  "status",
                  (e.target.value as "미방문" | "완료" | "보류" | "실패") ||
                    null,
                )
              }>
              <option value="미방문">미방문</option>
              <option value="완료">완료</option>
              <option value="보류">보류</option>
              <option value="실패">실패</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>{FIELD_LABELS.stocks}</Label>
            <Input
              type="number"
              min={0}
              value={form.stocks ?? 0}
              onChange={(e) =>
                update("stocks", parseInt(e.target.value, 10) || 0)
              }
            />
          </FormGroup>
          <FormGroup>
            <Label>{FIELD_LABELS.memo}</Label>
            <Input
              type="text"
              value={form.memo ?? ""}
              onChange={(e) => update("memo", e.target.value || null)}
              placeholder="메모"
            />
          </FormGroup>
          <FormGroup>
            <Label>{FIELD_LABELS.maker}</Label>
            <Input
              type="text"
              value={form.maker ?? ""}
              onChange={(e) => update("maker", e.target.value || null)}
              placeholder="마커(구분2)"
            />
          </FormGroup>
          <ButtonGroup>
            <Button type="button" className="cancel" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              className="save"
              disabled={createShareholder.isPending}>
              추가
            </Button>
          </ButtonGroup>
        </Form>
      </Modal>
    </Overlay>
  )
}
