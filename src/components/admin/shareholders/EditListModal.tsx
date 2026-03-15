import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState, useEffect } from "react"
import type { Tables } from "@/types/db"
import { useUpdateShareholderList } from "@/api/workspace"

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
  padding: 1.5rem;
  width: 100%;
  max-width: 28rem;
  box-shadow: var(--shadow-lg);
`

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  margin-bottom: 1.25rem;
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

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: ${COLORS.gray[700]};
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
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

type ShareholderListRow = Tables<"shareholder_lists">

interface Props {
  list: ShareholderListRow
  onClose: () => void
}

export default function EditListModal({ list, onClose }: Props) {
  const [name, setName] = useState(list.name)
  const [activeFrom, setActiveFrom] = useState(list.active_from ?? "")
  const [activeTo, setActiveTo] = useState(list.active_to ?? "")
  const [isVisible, setIsVisible] = useState(list.is_visible)
  const updateList = useUpdateShareholderList()

  useEffect(() => {
    setName(list.name)
    setActiveFrom(list.active_from ?? "")
    setActiveTo(list.active_to ?? "")
    setIsVisible(list.is_visible)
  }, [list])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateList.mutate(
      {
        id: list.id,
        name: name.trim(),
        active_from: activeFrom.trim() || null,
        active_to: activeTo.trim() || null,
        is_visible: isVisible,
      },
      {
        onSuccess: () => onClose(),
      },
    )
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>주주명부 수정</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>명부명 (상장사명 등)</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: OO상장사"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>활성화 시작일</Label>
            <Input
              type="date"
              value={activeFrom}
              onChange={(e) => setActiveFrom(e.target.value)}
            />
          </FormGroup>
          <FormGroup>
            <Label>활성화 종료일</Label>
            <Input
              type="date"
              value={activeTo}
              onChange={(e) => setActiveTo(e.target.value)}
            />
          </FormGroup>
          <ToggleLabel>
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
            />
            지도 노출
          </ToggleLabel>
          <ButtonGroup>
            <Button type="button" className="cancel" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              className="save"
              disabled={updateList.isPending || !name.trim()}>
              저장
            </Button>
          </ButtonGroup>
        </Form>
      </Modal>
    </Overlay>
  )
}
