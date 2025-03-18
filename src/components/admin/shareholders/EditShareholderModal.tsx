import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import { useQueryClient } from "react-query"
import supabaseAdmin from "@/lib/supabase/supabaseAdminClient"
import { Excel } from "@/types/excel"
import { toast } from "react-toastify"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { HistoryItem } from "@/component/excel-data-table"

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
  max-width: 80rem;
  max-height: 90vh;
  overflow-y: auto;
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

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-bottom: 1.5rem;
`

const FormSection = styled.div`
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
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;

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

const HistorySection = styled.div`
  margin-top: 2rem;
  border-top: 1px solid ${COLORS.gray[200]};
  padding-top: 1.5rem;
`

const HistoryTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${COLORS.gray[900]};
  margin-bottom: 1rem;
`

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${COLORS.gray[100]};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${COLORS.gray[300]};
    border-radius: 3px;
  }
`

const HistoryCard = styled.div`
  padding: 1rem;
  background: ${COLORS.gray[50]};
  border-radius: 0.5rem;
  border: 1px solid ${COLORS.gray[200]};
`

const HistoryHeader = styled.div`
  margin-bottom: 12px;
`

const ModifierInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ModifierName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${COLORS.gray[900]};
`

const TimeStamp = styled.div`
  font-size: 13px;
  color: ${COLORS.gray[500]};
`

const HistoryDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ChangeItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`

const FieldName = styled.div`
  font-size: 13px;
  color: ${COLORS.gray[500]};
  width: 40px;
  flex-shrink: 0;
`

const ChangeContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ status }) =>
    status === "완료"
      ? COLORS.green[50]
      : status === "미방문"
        ? COLORS.gray[100]
        : status === "보류"
          ? COLORS.yellow[50]
          : COLORS.red[50]};
  color: ${({ status }) =>
    status === "완료"
      ? COLORS.green[700]
      : status === "미방문"
        ? COLORS.gray[700]
        : status === "보류"
          ? COLORS.yellow[700]
          : COLORS.red[700]};
`

interface Props {
  data: Excel
  onClose: () => void
}

// 필드 라벨 매핑 객체 추가
export const FIELD_LABELS: Record<keyof Excel, string> = {
  id: "아이디",
  name: "이름",
  company: "회사명(구분1)",
  status: "상태",
  address: "주소",
  lat: "위도",
  lng: "경도",
  latlngaddress: "기존 주소(수정 전)",
  maker: "마커(구분2)",
  stocks: "주식수",
  memo: "메모",
  history: "히스토리",
  image: "이미지",
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

  const handleChange = (field: keyof Excel, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>주주 정보 수정</Title>
        <Form onSubmit={handleSubmit}>
          <FormGrid>
            <FormSection>
              <FormGroup>
                <Label>{FIELD_LABELS.name}</Label>
                <Input
                  type="text"
                  disabled
                  value={formData.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label>{FIELD_LABELS.address}</Label>
                <Input
                  type="text"
                  disabled
                  value={formData.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label>{FIELD_LABELS.status}</Label>
                <Select
                  value={formData.status || ""}
                  onChange={(e) => handleChange("status", e.target.value)}>
                  <option value="">선택하세요</option>
                  <option value="미방문">미방문</option>
                  <option value="완료">완료</option>
                  <option value="보류">보류</option>
                  <option value="실패">실패</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>{FIELD_LABELS.company}</Label>
                <Input
                  type="text"
                  value={formData.company || ""}
                  onChange={(e) => handleChange("company", e.target.value)}
                />
              </FormGroup>
            </FormSection>
            <FormSection>
              <FormGroup>
                <Label>{FIELD_LABELS.stocks}</Label>
                <Input
                  type="number"
                  disabled
                  value={formData.stocks || 0}
                  onChange={(e) =>
                    handleChange("stocks", parseInt(e.target.value) || 0)
                  }
                />
              </FormGroup>
              <FormGroup>
                <Label>{FIELD_LABELS.latlngaddress}</Label>
                <Input
                  type="text"
                  disabled
                  value={formData.latlngaddress || ""}
                  onChange={(e) =>
                    handleChange("latlngaddress", e.target.value)
                  }
                />
              </FormGroup>
              <FormGroup>
                <Label>{FIELD_LABELS.memo}</Label>
                <Input
                  type="text"
                  value={formData.memo || ""}
                  onChange={(e) => handleChange("memo", e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label>{FIELD_LABELS.maker}</Label>
                <Input
                  type="text"
                  value={formData.maker || ""}
                  onChange={(e) => handleChange("maker", e.target.value)}
                />
              </FormGroup>
            </FormSection>
          </FormGrid>

          <HistorySection>
            <HistoryTitle>변경 이력</HistoryTitle>
            <HistoryList>
              {Array.isArray(data.history) &&
                (data.history as HistoryItem[]).map(
                  (history: HistoryItem, index: number) => (
                    <HistoryCard key={index}>
                      <HistoryHeader>
                        <ModifierInfo>
                          <ModifierName>{history.modifier}</ModifierName>
                          <TimeStamp>{history.modified_at}</TimeStamp>
                        </ModifierInfo>
                      </HistoryHeader>
                      <HistoryDetails>
                        {history.changes.memo && (
                          <ChangeItem>
                            <FieldName>메모</FieldName>
                            <ChangeContent>
                              <span>
                                {history.changes.memo.original || "-"}
                              </span>
                              <span>→</span>
                              <span>{history.changes.memo.modified}</span>
                            </ChangeContent>
                          </ChangeItem>
                        )}
                        {history.changes.status && (
                          <ChangeItem>
                            <FieldName>상태</FieldName>
                            <ChangeContent>
                              <StatusBadge
                                status={history.changes.status.original}>
                                {history.changes.status.original}
                              </StatusBadge>
                              <span>→</span>
                              <StatusBadge
                                status={history.changes.status.modified}>
                                {history.changes.status.modified}
                              </StatusBadge>
                            </ChangeContent>
                          </ChangeItem>
                        )}
                      </HistoryDetails>
                    </HistoryCard>
                  ),
                )}
            </HistoryList>
          </HistorySection>

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
