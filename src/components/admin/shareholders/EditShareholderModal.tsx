import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useEffect, useMemo, useRef, useState } from "react"
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
import {
  AGMEETING_DETAIL_OPTIONS_FOR_UI,
  composeShareholderStatus,
  completionDetailFromPhotos,
  PRIMARY_STATUS_OPTIONS,
  splitShareholderStatus,
  STATUS_DETAIL_OPTIONS,
  type PrimaryStatus,
} from "@/lib/shareholderStatus"
import {
  formatKoreanPhoneInput,
  normalizePhoneForDb,
} from "@/lib/formatKoreanPhone"

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

const PhotoPickRow = styled.div`
  position: relative;
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 8px;
`

const PhotoPickButton = styled.button`
  flex: 1 1 auto;
  min-height: 44px;
  min-width: min(100%, 140px);
  padding: 10px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${COLORS.blue[700]};
  background: ${COLORS.blue[50]};
  border: 1px solid ${COLORS.blue[200]};
  border-radius: 10px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${COLORS.blue[100]};
  }
`

const VisuallyHiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const PhotoPickHelper = styled.p`
  margin: 6px 0 0;
  font-size: 0.75rem;
  color: ${COLORS.gray[500]};
  line-height: 1.45;
`

type Shareholder = Tables<"shareholders">

function completionStatusPatchIfPrimaryComplete(
  primary: PrimaryStatus,
  proxyUrl: string | null | undefined,
  idCardUrl: string | null | undefined,
): { status?: string } {
  if (primary !== "완료") return {}

  return {
    status: composeShareholderStatus(
      "완료",
      completionDetailFromPhotos(proxyUrl, idCardUrl),
    ),
  }
}

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
  phone: "휴대폰 번호",
  image: "신분증 사진 URL",
  proxy_document_image: "의결권 서류 사진 URL",
}

export default function EditShareholderModal({ data, userId, onClose }: Props) {
  const [formData, setFormData] = useState<Shareholder>(() => ({
    ...data,
    phone: normalizePhoneForDb(data.phone),
  }))
  const [photoBusy, setPhotoBusy] = useState<"" | "id" | "proxy">("")
  const idPhotoInputRef = useRef<HTMLInputElement>(null)
  const proxyPhotoInputRef = useRef<HTMLInputElement>(null)
  const parsedStatus = splitShareholderStatus(data.status)
  const [statusPrimary, setStatusPrimary] = useState<PrimaryStatus>(
    parsedStatus.primary,
  )
  const [statusDetail, setStatusDetail] = useState(parsedStatus.detail)
  const patchShareholder = usePatchShareholder()
  const { data: changeHistoryBundle } = useShareholderChangeHistory(data.id)

  useEffect(() => {
    const parsed = splitShareholderStatus(data.status)
    setFormData({
      ...data,
      phone: normalizePhoneForDb(data.phone),
    })
    setStatusPrimary(parsed.primary)
    setStatusDetail(parsed.detail)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `data` 전체가 아니라 id·서버 필드만 바뀔 때 동기화
  }, [data.id, data.status, data.phone])
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
    const effectiveDetail =
      statusPrimary === "완료"
        ? completionDetailFromPhotos(
            formData.proxy_document_image,
            formData.image,
          )
        : statusDetail.trim()
    if (statusPrimary !== "완료" && !effectiveDetail) {
      toast.error("상세 상태를 선택해야 저장할 수 있습니다.")

      return
    }

    try {
      await patchShareholder.mutateAsync({
        patch: {
          id: data.id,
          name: formData.name,
          address: formData.address,
          status: composeShareholderStatus(statusPrimary, effectiveDetail),
          company: formData.company,
          stocks: formData.stocks,
          latlngaddress: formData.latlngaddress,
          memo: formData.memo,
          phone: normalizePhoneForDb(formData.phone),
          maker: formData.maker,
          image: formData.image,
          proxy_document_image: formData.proxy_document_image,
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
                    if (nextPrimary === "완료") {
                      setStatusDetail(
                        completionDetailFromPhotos(
                          formData.proxy_document_image,
                          formData.image,
                        ),
                      )
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
                  <p
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.875rem",
                      color: COLORS.gray[600],
                      lineHeight: 1.55,
                    }}>
                    완료 세부는 아래 &quot;의결권 서류 사진&quot;·&quot;신분증
                    사진&quot; 등록 여부로 자동 반영됩니다. (의결권{" "}
                    {formData.proxy_document_image?.trim() ? "O" : "X"} · 신분증{" "}
                    {formData.image?.trim() ? "O" : "X"})
                  </p>
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
                <Label>{FIELD_LABELS.maker}</Label>
                <Input
                  type="text"
                  value={formData.maker || ""}
                  onChange={(e) => handleChange("maker", e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label>{FIELD_LABELS.phone}</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="010-0000-0000"
                  value={formatKoreanPhoneInput(formData.phone ?? "")}
                  onChange={(e) =>
                    handleChange("phone", normalizePhoneForDb(e.target.value))
                  }
                />
              </FormGroup>
              <FormGroup>
                <Label>신분증 사진</Label>
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
                <PhotoPickRow>
                  <PhotoPickButton
                    type="button"
                    disabled={photoBusy !== "" || patchShareholder.isPending}
                    aria-busy={photoBusy === "id"}
                    onClick={() => idPhotoInputRef.current?.click()}>
                    {photoBusy === "id"
                      ? "업로드 중…"
                      : formData.image
                        ? "신분증 사진 바꾸기"
                        : "신분증 사진 올리기"}
                  </PhotoPickButton>
                  <VisuallyHiddenFileInput
                    ref={idPhotoInputRef}
                    type="file"
                    accept="image/*"
                    disabled={photoBusy !== "" || patchShareholder.isPending}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ""
                      if (!file) return
                      setPhotoBusy("id")
                      try {
                        const url = await uploadShareholderPhotoAndGetPublicUrl(
                          file,
                          data.list_id,
                          data.id,
                          "id",
                        )
                        setFormData((prev) => ({ ...prev, image: url }))
                        const nextDetail = completionDetailFromPhotos(
                          formData.proxy_document_image,
                          url,
                        )
                        if (statusPrimary === "완료") {
                          setStatusDetail(nextDetail)
                        }
                        await patchShareholder.mutateAsync({
                          patch: {
                            id: data.id,
                            image: url,
                            ...completionStatusPatchIfPrimaryComplete(
                              statusPrimary,
                              formData.proxy_document_image,
                              url,
                            ),
                          },
                          userId,
                        })
                        toast.success("신분증 사진을 반영했습니다.")
                      } catch (err) {
                        reportError(err, {
                          toastMessage: "신분증 사진 업로드에 실패했습니다.",
                        })
                      } finally {
                        setPhotoBusy("")
                      }
                    }}
                  />
                </PhotoPickRow>
                <PhotoPickHelper>
                  모바일에서 갤러리·카메라를 고를 수 있으며, 네이티브
                  &quot;선택된 파일 없음&quot; 줄은 표시하지 않습니다.
                </PhotoPickHelper>
                {formData.image ? (
                  <button
                    type="button"
                    disabled={photoBusy !== "" || patchShareholder.isPending}
                    style={{
                      marginTop: 8,
                      minHeight: 44,
                      padding: "10px 14px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: COLORS.red[700],
                      background: COLORS.red[50],
                      border: "none",
                      borderRadius: 10,
                      cursor: "pointer",
                      touchAction: "manipulation",
                    }}
                    onClick={async () => {
                      setPhotoBusy("id")
                      try {
                        await removeShareholderPhotoObject(
                          data.list_id,
                          data.id,
                          formData.image,
                        )
                        setFormData((prev) => ({ ...prev, image: null }))
                        const nextDetail = completionDetailFromPhotos(
                          formData.proxy_document_image,
                          null,
                        )
                        if (statusPrimary === "완료") {
                          setStatusDetail(nextDetail)
                        }
                        await patchShareholder.mutateAsync({
                          patch: {
                            id: data.id,
                            image: null,
                            ...completionStatusPatchIfPrimaryComplete(
                              statusPrimary,
                              formData.proxy_document_image,
                              null,
                            ),
                          },
                          userId,
                        })
                        toast.success("신분증 사진을 삭제했습니다.")
                      } catch (err) {
                        reportError(err, {
                          toastMessage: "신분증 사진 삭제에 실패했습니다.",
                        })
                      } finally {
                        setPhotoBusy("")
                      }
                    }}>
                    신분증 사진 삭제
                  </button>
                ) : null}
              </FormGroup>
              <FormGroup>
                <Label>의결권 서류 사진</Label>
                {formData.proxy_document_image ? (
                  <img
                    src={formData.proxy_document_image}
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
                <PhotoPickRow>
                  <PhotoPickButton
                    type="button"
                    disabled={photoBusy !== "" || patchShareholder.isPending}
                    aria-busy={photoBusy === "proxy"}
                    onClick={() => proxyPhotoInputRef.current?.click()}>
                    {photoBusy === "proxy"
                      ? "업로드 중…"
                      : formData.proxy_document_image
                        ? "의결권 서류 바꾸기"
                        : "의결권 서류 올리기"}
                  </PhotoPickButton>
                  <VisuallyHiddenFileInput
                    ref={proxyPhotoInputRef}
                    type="file"
                    accept="image/*"
                    disabled={photoBusy !== "" || patchShareholder.isPending}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ""
                      if (!file) return
                      setPhotoBusy("proxy")
                      try {
                        const url = await uploadShareholderPhotoAndGetPublicUrl(
                          file,
                          data.list_id,
                          data.id,
                          "proxy",
                        )
                        setFormData((prev) => ({
                          ...prev,
                          proxy_document_image: url,
                        }))
                        const nextDetail = completionDetailFromPhotos(
                          url,
                          formData.image,
                        )
                        if (statusPrimary === "완료") {
                          setStatusDetail(nextDetail)
                        }
                        await patchShareholder.mutateAsync({
                          patch: {
                            id: data.id,
                            proxy_document_image: url,
                            ...completionStatusPatchIfPrimaryComplete(
                              statusPrimary,
                              url,
                              formData.image,
                            ),
                          },
                          userId,
                        })
                        toast.success("의결권 서류 사진을 반영했습니다.")
                      } catch (err) {
                        reportError(err, {
                          toastMessage:
                            "의결권 서류 사진 업로드에 실패했습니다.",
                        })
                      } finally {
                        setPhotoBusy("")
                      }
                    }}
                  />
                </PhotoPickRow>
                <PhotoPickHelper>
                  모바일에서 갤러리·카메라를 고를 수 있습니다.
                </PhotoPickHelper>
                {formData.proxy_document_image ? (
                  <button
                    type="button"
                    disabled={photoBusy !== "" || patchShareholder.isPending}
                    style={{
                      marginTop: 8,
                      minHeight: 44,
                      padding: "10px 14px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: COLORS.red[700],
                      background: COLORS.red[50],
                      border: "none",
                      borderRadius: 10,
                      cursor: "pointer",
                      touchAction: "manipulation",
                    }}
                    onClick={async () => {
                      setPhotoBusy("proxy")
                      try {
                        await removeShareholderPhotoObject(
                          data.list_id,
                          data.id,
                          formData.proxy_document_image,
                        )
                        setFormData((prev) => ({
                          ...prev,
                          proxy_document_image: null,
                        }))
                        const nextDetail = completionDetailFromPhotos(
                          null,
                          formData.image,
                        )
                        if (statusPrimary === "완료") {
                          setStatusDetail(nextDetail)
                        }
                        await patchShareholder.mutateAsync({
                          patch: {
                            id: data.id,
                            proxy_document_image: null,
                            ...completionStatusPatchIfPrimaryComplete(
                              statusPrimary,
                              null,
                              formData.image,
                            ),
                          },
                          userId,
                        })
                        toast.success("의결권 서류 사진을 삭제했습니다.")
                      } catch (err) {
                        reportError(err, {
                          toastMessage: "의결권 서류 사진 삭제에 실패했습니다.",
                        })
                      } finally {
                        setPhotoBusy("")
                      }
                    }}>
                    의결권 서류 사진 삭제
                  </button>
                ) : null}
              </FormGroup>
              <FormGroup>
                <Label>{FIELD_LABELS.memo}</Label>
                <Input
                  type="text"
                  value={formData.memo || ""}
                  onChange={(e) => handleChange("memo", e.target.value)}
                />
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
                          {history.changes?.phone && (
                            <ChangeItem>
                              <FieldName>{FIELD_LABELS.phone}</FieldName>
                              <ChangeContent>
                                <span>
                                  {formatKoreanPhoneInput(
                                    history.changes.phone.original,
                                  ) || "-"}
                                </span>
                                <span>→</span>
                                <span>
                                  {formatKoreanPhoneInput(
                                    history.changes.phone.modified,
                                  )}
                                </span>
                              </ChangeContent>
                            </ChangeItem>
                          )}
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
