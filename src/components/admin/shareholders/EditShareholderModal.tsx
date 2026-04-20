import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import type { HistoryItem } from "@/components/ui/marker-detail-table"
import { formatChangeHistoryTimestamp } from "@/lib/shareholderChangeHistoryValues"
import { reportError } from "@/lib/reportError"
import type { Tables } from "@/types/db"
import {
  usePatchShareholder,
  useShareholderChangeHistory,
} from "@/api/workspace"
import {
  removeShareholderPhotoObject,
  uploadShareholderPhotoAndGetPublicUrl,
} from "@/lib/shareholderPhotoStorage"
import Select from "@/components/ui/select"
import CompletionStatusChecklist from "@/components/ui/completion-status-checklist"
import {
  AGMEETING_DETAIL_OPTIONS_FOR_UI,
  composeShareholderStatus,
  composeCompletionDetail,
  inferCompletionAxes,
  isCanonicalCompletionDetail,
  PRIMARY_STATUS_OPTIONS,
  splitShareholderStatus,
  STATUS_DETAIL_OPTIONS,
  type PrimaryStatus,
} from "@/lib/shareholderStatus"

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

const ModalSelect = styled(Select)`
  width: 100%;
  padding: 0.75rem 2rem 0.75rem 0.75rem;
  font-size: 1rem;
  &:focus {
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

type Shareholder = Tables<"shareholders">

interface Props {
  data: Shareholder
  userId: string
  onClose: () => void
}

export const FIELD_LABELS: Record<string, string> = {
  shareholderId: "주주ID(재업로드 시 갱신)",
  name: "이름",
  company: "회사명(구분1)",
  status: "상태",
  address: "주소",
  address_original: "원본 주소(엑셀)",
  lat: "위도",
  lng: "경도",
  latlngaddress: "기존 주소(수정 전)",
  maker: "마커(구분2)",
  stocks: "주식수",
  memo: "메모",
  image: "사진 URL",
}

export default function EditShareholderModal({ data, userId, onClose }: Props) {
  const [formData, setFormData] = useState<Shareholder>(data)
  const [photoBusy, setPhotoBusy] = useState(false)
  const parsedStatus = splitShareholderStatus(data.status)
  const [statusPrimary, setStatusPrimary] = useState<PrimaryStatus>(
    parsedStatus.primary,
  )
  const [statusDetail, setStatusDetail] = useState(parsedStatus.detail)
  const [completionDoc, setCompletionDoc] = useState<"" | "done" | "hold">("")
  const [completionId, setCompletionId] = useState<"" | "done" | "hold">("")
  const patchShareholder = usePatchShareholder()

  useEffect(() => {
    const p = splitShareholderStatus(data.status)
    if (p.primary === "완료") {
      const ax = inferCompletionAxes(p.detail)
      setCompletionDoc(ax.doc === "done" || ax.doc === "hold" ? ax.doc : "")
      setCompletionId(ax.id === "done" || ax.id === "hold" ? ax.id : "")
    } else {
      setCompletionDoc("")
      setCompletionId("")
    }
  }, [data.id, data.status])
  const { data: changeHistoryBundle } = useShareholderChangeHistory(data.id)
  const changeHistoryRows = changeHistoryBundle?.rows ?? []
  const changedByUser = changeHistoryBundle?.changedByUser ?? {}

  const modifierLabel = (uid: string) => {
    const u = changedByUser[uid]

    return u?.name?.trim() || u?.email || uid
  }

  const statusDetailSelectOptions = useMemo(() => {
    if (statusPrimary !== "주주총회") {
      return STATUS_DETAIL_OPTIONS[statusPrimary] ?? []
    }
    const base: string[] = [...AGMEETING_DETAIL_OPTIONS_FOR_UI]
    const d = statusDetail.trim()
    const all = STATUS_DETAIL_OPTIONS.주주총회
    if (d && !base.includes(d) && all.includes(d)) {
      return [...base, d]
    }

    return base
  }, [statusPrimary, statusDetail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusDetail.trim()) {
      toast.error("상세 상태를 선택해야 저장할 수 있습니다.")

      return
    }
    if (
      statusPrimary === "완료" &&
      !isCanonicalCompletionDetail(statusDetail.trim())
    ) {
      toast.error(
        "완료로 저장하려면 의결권 서류·신분증 항목을 각각 하나씩 선택해 주세요.",
      )

      return
    }

    try {
      await patchShareholder.mutateAsync({
        patch: {
          id: data.id,
          name: formData.name,
          address: formData.address,
          status: composeShareholderStatus(statusPrimary, statusDetail),
          company: formData.company,
          stocks: formData.stocks,
          latlngaddress: formData.latlngaddress,
          memo: formData.memo,
          maker: formData.maker,
          image: formData.image,
        },
        userId,
      })
      toast.success("데이터가 성공적으로 수정되었습니다.")
      onClose()
    } catch (error) {
      reportError(error, {
        toastMessage:
          "데이터 수정 중 오류가 발생했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
      })
    }
  }

  const handleChange = (
    field: keyof Shareholder,
    value: string | number | null,
  ) => {
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
              {formData.address_original ? (
                <FormGroup>
                  <Label>{FIELD_LABELS.address_original}</Label>
                  <Input
                    type="text"
                    disabled
                    value={formData.address_original}
                  />
                </FormGroup>
              ) : null}
              <FormGroup>
                <Label>{FIELD_LABELS.status}</Label>
                <ModalSelect
                  value={statusPrimary}
                  onChange={(e) => {
                    const nextPrimary = e.target.value as PrimaryStatus
                    setStatusPrimary(nextPrimary)
                    setCompletionDoc("")
                    setCompletionId("")
                    if (nextPrimary === "완료") {
                      setStatusDetail("")
                    } else {
                      setStatusDetail(
                        STATUS_DETAIL_OPTIONS[nextPrimary][0] ?? "",
                      )
                    }
                  }}>
                  {PRIMARY_STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </ModalSelect>
                {statusPrimary === "완료" ? (
                  <div style={{ marginTop: "0.5rem" }}>
                    <CompletionStatusChecklist
                      doc={completionDoc}
                      id={completionId}
                      disabled={patchShareholder.isPending}
                      onDoc={(v) => {
                        setCompletionDoc(v)
                        setCompletionId((curId) => {
                          if (curId === "done" || curId === "hold") {
                            setStatusDetail(composeCompletionDetail(v, curId))
                          } else {
                            setStatusDetail("")
                          }

                          return curId
                        })
                      }}
                      onId={(v) => {
                        setCompletionId(v)
                        setCompletionDoc((curDoc) => {
                          if (curDoc === "done" || curDoc === "hold") {
                            setStatusDetail(composeCompletionDetail(curDoc, v))
                          } else {
                            setStatusDetail("")
                          }

                          return curDoc
                        })
                      }}
                    />
                  </div>
                ) : (
                  <ModalSelect
                    style={{ marginTop: "0.5rem" }}
                    value={statusDetail}
                    onChange={(e) => setStatusDetail(e.target.value)}>
                    {statusDetailSelectOptions.map((detail) => (
                      <option key={detail} value={detail}>
                        {detail}
                      </option>
                    ))}
                  </ModalSelect>
                )}
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
              <FormGroup>
                <Label>사진</Label>
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt=""
                    style={{
                      maxWidth: 160,
                      maxHeight: 120,
                      borderRadius: 8,
                      objectFit: "cover",
                      display: "block",
                      marginBottom: 8,
                    }}
                  />
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  disabled={photoBusy || patchShareholder.isPending}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (!file) return
                    setPhotoBusy(true)
                    try {
                      const url = await uploadShareholderPhotoAndGetPublicUrl(
                        file,
                        data.list_id,
                        data.id,
                      )
                      setFormData((prev) => ({ ...prev, image: url }))
                      await patchShareholder.mutateAsync({
                        patch: { id: data.id, image: url },
                        userId,
                      })
                      toast.success("사진을 반영했습니다.")
                    } catch (err) {
                      reportError(err, {
                        toastMessage: "사진 업로드에 실패했습니다.",
                      })
                    } finally {
                      setPhotoBusy(false)
                    }
                  }}
                />
                {formData.image ? (
                  <button
                    type="button"
                    disabled={photoBusy || patchShareholder.isPending}
                    style={{
                      marginTop: 8,
                      padding: "6px 12px",
                      fontSize: "0.8125rem",
                      color: COLORS.red[700],
                      background: COLORS.red[50],
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                    onClick={async () => {
                      setPhotoBusy(true)
                      try {
                        await removeShareholderPhotoObject(
                          data.list_id,
                          data.id,
                          formData.image,
                        )
                        setFormData((prev) => ({ ...prev, image: null }))
                        await patchShareholder.mutateAsync({
                          patch: { id: data.id, image: null },
                          userId,
                        })
                        toast.success("사진을 삭제했습니다.")
                      } catch (err) {
                        reportError(err, {
                          toastMessage: "사진 삭제에 실패했습니다.",
                        })
                      } finally {
                        setPhotoBusy(false)
                      }
                    }}>
                    사진 삭제
                  </button>
                ) : null}
              </FormGroup>
            </FormSection>
          </FormGrid>

          <HistorySection>
            <HistoryTitle>변경 이력</HistoryTitle>
            <HistoryList>
              {changeHistoryRows.length > 0
                ? changeHistoryRows.map((row) => (
                    <HistoryCard key={row.id}>
                      <HistoryHeader>
                        <ModifierInfo>
                          <ModifierName>
                            {modifierLabel(row.changed_by)}
                          </ModifierName>
                          <TimeStamp>
                            {formatChangeHistoryTimestamp(row.changed_at)}
                          </TimeStamp>
                        </ModifierInfo>
                      </HistoryHeader>
                      <HistoryDetails>
                        <ChangeItem>
                          <FieldName>
                            {FIELD_LABELS[row.field] ?? row.field}
                          </FieldName>
                          <ChangeContent>
                            <span>{row.old_value ?? "-"}</span>
                            <span>→</span>
                            <span>{row.new_value ?? "-"}</span>
                          </ChangeContent>
                        </ChangeItem>
                      </HistoryDetails>
                    </HistoryCard>
                  ))
                : Array.isArray(data.history) &&
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
                          {history.changes?.memo && (
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
                          {history.changes?.status && (
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
