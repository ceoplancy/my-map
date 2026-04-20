import styled from "@emotion/styled"
import type { MapMarkerData } from "@/types/map"
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import CircularProgress from "@mui/material/CircularProgress"
import { useFormik } from "formik"
import { removeTags } from "@/lib/utils"
import { Close as CloseIcon } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"
import { type HistoryItem } from "../marker-detail-table"
import { toast } from "react-toastify"
import { Json } from "@/types/db"
import { useGetUserData } from "@/api/auth"
import { format } from "date-fns"
import {
  hasPatchChanges,
  normalizeMemoForPatch,
  normalizeStatusForPatch,
} from "@/lib/makerPatchForm"
import {
  composeShareholderStatus,
  composeCompletionDetail,
  inferCompletionAxes,
  isAllowedStatusDetail,
  isCanonicalCompletionDetail,
  PRIMARY_STATUS_OPTIONS,
  splitShareholderStatus,
  AGMEETING_DETAIL_OPTIONS_FOR_UI,
  STATUS_DETAIL_OPTIONS,
  getShareholderStatusChipBackground,
  getShareholderStatusChipColor,
} from "@/lib/shareholderStatus"
import CompletionStatusChecklist from "../completion-status-checklist"
import { getKakaoMapLinkUrl } from "@/lib/kakaoMapLinks"
import OpenInNew from "@mui/icons-material/OpenInNew"
import {
  removeShareholderPhotoObject,
  uploadShareholderPhotoAndGetPublicUrl,
} from "@/lib/shareholderPhotoStorage"

export type MakerDataMutateOptions = {
  onSuccess?: () => void
  onError?: () => void
  onSettled?: () => void
}

interface MakerPatchModalChildrenProps {
  makerData: MapMarkerData | null
  makerDataMutate: (
    _patchData: MapMarkerData,
    _options?: MakerDataMutateOptions,
  ) => void
  setMakerDataUpdateIsModalOpen: Dispatch<SetStateAction<boolean>>

  /** 지도 주주 마커: API로 불러온 변경 이력 (편집 모달에서는 요약만 — 숫자만 표시) */
  history?: HistoryItem[]

  mutateIsPending?: boolean
  onSavingChange?: (_isSaving: boolean) => void
}

function findDifferences<T extends Record<string, unknown>>(
  original: T,
  modified: T,
): Record<string, { original: unknown; modified: unknown }> {
  const differences: Record<string, { original: unknown; modified: unknown }> =
    {}
  for (const key of Object.keys(modified)) {
    if (original[key] !== modified[key]) {
      differences[key] = {
        original: original[key],
        modified: modified[key],
      }
    }
  }

  return differences
}

const MakerPatchModalChildren = ({
  makerData,
  makerDataMutate,
  setMakerDataUpdateIsModalOpen,
  history,
  mutateIsPending = false,
  onSavingChange,
}: MakerPatchModalChildrenProps) => {
  const { data: user } = useGetUserData()
  const saveInFlightRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const saveSucceededRef = useRef(false)

  /** 완료(1차)일 때 의결권·신분증 각각 한 축 선택 — formik.statusDetail과 동기 */
  const [completionDoc, setCompletionDoc] = useState<"" | "done" | "hold">("")
  const [completionId, setCompletionId] = useState<"" | "done" | "hold">("")

  const isSaveBusy = isSaving || mutateIsPending

  const formik = useFormik({
    initialValues: {
      id: makerData?.id ?? 0,
      address: makerData?.address ?? "",
      company: makerData?.company ?? "",
      lat: makerData?.lat ?? 0,
      lng: makerData?.lng ?? 0,
      latlngaddress: makerData?.latlngaddress ?? "",
      maker: makerData?.maker ?? "",
      name: makerData?.name ?? "",
      status: makerData?.status ?? "미방문",
      statusPrimary: splitShareholderStatus(makerData?.status).primary,
      statusDetail: splitShareholderStatus(makerData?.status).detail,
      memo: makerData?.memo ?? "",
      stocks: makerData?.stocks ?? 0,
      image: makerData?.image ?? "",
      history: makerData?.history ?? [],
    },
    onSubmit: (values) => {
      if (!makerData || saveInFlightRef.current) return

      const statusPrimary = values.statusPrimary
      const statusDetail = (values.statusDetail ?? "").trim()
      const detailOk =
        statusPrimary === "완료"
          ? isCanonicalCompletionDetail(statusDetail)
          : isAllowedStatusDetail(statusPrimary, statusDetail)
      if (!detailOk) {
        toast.error(
          statusPrimary === "완료"
            ? "완료로 저장하려면 의결권 서류·신분증 항목을 각각 하나씩 선택해 주세요."
            : "1차 상태를 고른 뒤, 세부 상태까지 선택해야 저장할 수 있습니다.",
        )

        return
      }
      const status = composeShareholderStatus(statusPrimary, statusDetail)
      if (
        !hasPatchChanges(makerData, {
          status,
          memo: values.memo,
        })
      ) {
        return
      }

      saveInFlightRef.current = true
      saveSucceededRef.current = false
      setIsSaving(true)
      onSavingChange?.(true)

      const original = {
        status: makerData.status,
        memo: makerData.memo,
      }
      const modified = {
        status,
        memo: values.memo,
      }
      const name = user?.user?.user_metadata?.name
      const email = user?.user?.email ?? ""
      const modifier = name
        ? `${name} (${email})`
        : email
          ? `미확인 (${email})`
          : "미확인"

      const modified_at = format(new Date(), "yyyy년 MM월 dd일 HH시 mm분 ss초")
      const changes = findDifferences(
        original as Record<string, unknown>,
        modified as Record<string, unknown>,
      )

      const historyPayload: Json = (
        makerData.history
          ? [
              ...(Array.isArray(makerData.history)
                ? (makerData.history as unknown[])
                : []),
              { modifier, modified_at, changes },
            ]
          : [{ modifier, modified_at, changes }]
      ) as Json

      const patchData: MapMarkerData = {
        ...makerData,
        address: values.address,
        company: values.company,
        lat: values.lat,
        lng: values.lng,
        latlngaddress: values.latlngaddress,
        maker: values.maker,
        name: values.name,
        status,
        memo: values.memo,
        stocks: values.stocks,
        image: values.image,
        history: historyPayload,
      }
      makerDataMutate(patchData, {
        onSuccess: () => {
          saveSucceededRef.current = true
          toast.success("주주 정보가 수정되었습니다.")
        },
        onError: () => {
          toast.error(
            "주주 정보 수정에 실패했습니다. 저장되지 않았습니다. 다시 시도해 주세요.",
          )
        },
        onSettled: () => {
          saveInFlightRef.current = false
          setIsSaving(false)
          onSavingChange?.(false)
          if (saveSucceededRef.current) {
            setMakerDataUpdateIsModalOpen(false)
          }
        },
      })
    },
  })

  useEffect(() => {
    if (makerData) {
      const parsed = splitShareholderStatus(makerData.status)
      if (parsed.primary === "완료") {
        const ax = inferCompletionAxes(parsed.detail)
        setCompletionDoc(ax.doc === "done" || ax.doc === "hold" ? ax.doc : "")
        setCompletionId(ax.id === "done" || ax.id === "hold" ? ax.id : "")
      } else {
        setCompletionDoc("")
        setCompletionId("")
      }
      formik.setValues({
        id: makerData.id,
        address: makerData.address ?? "",
        company: makerData.company ?? "",
        lat: makerData.lat ?? 0,
        lng: makerData.lng ?? 0,
        latlngaddress: makerData.latlngaddress ?? "",
        maker: makerData.maker ?? "",
        name: makerData.name ?? "",
        status: makerData.status ?? "미방문",
        statusPrimary: parsed.primary,
        statusDetail: parsed.detail,
        memo: makerData.memo ?? "",
        stocks: makerData.stocks ?? 0,
        image: makerData.image ?? "",
        history: makerData.history ?? [],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- makerData 변경 시만 폼 동기화
  }, [makerData])

  const statusComplete =
    formik.values.statusPrimary === "완료"
      ? isCanonicalCompletionDetail(formik.values.statusDetail)
      : isAllowedStatusDetail(
          formik.values.statusPrimary,
          formik.values.statusDetail,
        )

  const detailChipOptions = useMemo(() => {
    const p = formik.values.statusPrimary
    if (p !== "주주총회") {
      return STATUS_DETAIL_OPTIONS[p] ?? []
    }
    const base: string[] = [...AGMEETING_DETAIL_OPTIONS_FOR_UI]
    const d = (formik.values.statusDetail ?? "").trim()
    const all = STATUS_DETAIL_OPTIONS.주주총회
    if (d && !base.includes(d) && all.includes(d)) {
      return [...base, d]
    }

    return base
  }, [formik.values.statusPrimary, formik.values.statusDetail])

  const pendingComposedStatus = useMemo(() => {
    if (!statusComplete) return null

    return composeShareholderStatus(
      formik.values.statusPrimary,
      formik.values.statusDetail.trim(),
    )
  }, [statusComplete, formik.values.statusPrimary, formik.values.statusDetail])

  const hasEditableChanges = useMemo(() => {
    if (!makerData) return false
    const memoChanged =
      normalizeMemoForPatch(formik.values.memo) !==
      normalizeMemoForPatch(makerData.memo)
    if (!statusComplete || pendingComposedStatus === null) {
      return false
    }
    const statusChanged =
      normalizeStatusForPatch(pendingComposedStatus) !==
      normalizeStatusForPatch(makerData.status)

    return statusChanged || memoChanged
  }, [makerData, formik.values.memo, statusComplete, pendingComposedStatus])

  const canSubmit = hasEditableChanges && statusComplete && !isSaveBusy

  const mapLink = makerData
    ? getKakaoMapLinkUrl({
        name: makerData.name,
        address: makerData.address,
        lat: makerData.lat ?? null,
        lng: makerData.lng ?? null,
      })
    : null

  const submitBlockReason = !statusComplete
    ? formik.values.statusPrimary === "완료"
      ? "완료 시 의결권 서류·신분증 항목을 각각 하나씩 선택해 주세요"
      : "1차·세부 상태를 모두 선택한 뒤 저장할 수 있습니다"
    : !hasEditableChanges
      ? "상태 또는 메모를 변경한 뒤 저장할 수 있습니다"
      : undefined

  return (
    <>
      <ModalHeader>
        <HeaderTitle>주주 정보 수정</HeaderTitle>
        <CloseButton
          type="button"
          disabled={isSaveBusy}
          aria-disabled={isSaveBusy}
          title={isSaveBusy ? "저장 중에는 닫을 수 없습니다" : "닫기"}
          onClick={() => {
            if (isSaveBusy) return
            setMakerDataUpdateIsModalOpen(false)
          }}>
          <CloseIcon />
        </CloseButton>
      </ModalHeader>

      <ModalBodyColumn>
        <ModalScrollPane>
          <ModalForm onSubmit={formik.handleSubmit} noValidate>
            <Section>
              <SectionTitle>현재 정보</SectionTitle>
              {makerData && (
                <CurrentInfoCard>
                  <SummaryName>{makerData.name ?? "-"}</SummaryName>
                  <SummaryMetaRow>
                    <SummaryMetaText>
                      {makerData.company ?? "-"}
                    </SummaryMetaText>
                    <SummaryMetaDot aria-hidden>·</SummaryMetaDot>
                    <SummaryMetaText>
                      {`${Number(makerData.stocks ?? 0).toLocaleString()}주`}
                    </SummaryMetaText>
                    <SummaryMetaDot aria-hidden>·</SummaryMetaDot>
                    <SummaryStatusChip
                      status={String(makerData.status ?? "미방문")}>
                      {String(makerData.status ?? "미방문")}
                    </SummaryStatusChip>
                  </SummaryMetaRow>
                  {mapLink ? (
                    <AddressLinkRow
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer">
                      <span>
                        {makerData.address?.trim() || "카카오맵에서 위치 보기"}
                      </span>
                      <OpenInNew sx={{ fontSize: 16, flexShrink: 0 }} />
                    </AddressLinkRow>
                  ) : (
                    <AddressPlain>
                      {makerData.address?.trim() || "주소 없음"}
                    </AddressPlain>
                  )}
                  {history && history.length > 0 && (
                    <HistoryNote>
                      변경 이력 {history.length}건 반영 중
                    </HistoryNote>
                  )}
                </CurrentInfoCard>
              )}
            </Section>

            <Section>
              <SectionTitle>상태 변경</SectionTitle>
              <FieldLabel id="label-primary">1차 · 상태 유형</FieldLabel>
              <ChipRow role="group" aria-labelledby="label-primary">
                {PRIMARY_STATUS_OPTIONS.map((opt) => (
                  <StatusChip
                    key={opt}
                    type="button"
                    $active={formik.values.statusPrimary === opt}
                    disabled={isSaveBusy}
                    onClick={() => {
                      formik.setFieldValue("statusPrimary", opt)
                      formik.setFieldValue("statusDetail", "")
                      setCompletionDoc("")
                      setCompletionId("")
                    }}>
                    {opt}
                  </StatusChip>
                ))}
              </ChipRow>

              <FieldLabel id="label-detail" style={{ marginTop: "1rem" }}>
                {formik.values.statusPrimary === "완료"
                  ? "2차 · 완료 확인 (필수)"
                  : "2차 · 세부 상태"}
                <RequiredMark aria-hidden> (필수)</RequiredMark>
              </FieldLabel>
              {!formik.values.statusDetail &&
                formik.values.statusPrimary &&
                formik.values.statusPrimary !== "완료" && (
                  <StepHint>
                    유형을 바꾼 경우 아래에서 세부 상태를 반드시 선택해 주세요.
                  </StepHint>
                )}
              {formik.values.statusPrimary === "완료" ? (
                <>
                  <StepHint>
                    의결권 서류·신분증 각 줄에서 하나씩 선택해야 저장할 수
                    있습니다.
                  </StepHint>
                  <CompletionStatusChecklist
                    doc={completionDoc}
                    id={completionId}
                    disabled={isSaveBusy}
                    onDoc={(v) => {
                      setCompletionDoc(v)
                      setCompletionId((curId) => {
                        if (curId === "done" || curId === "hold") {
                          const detail = composeCompletionDetail(v, curId)
                          formik.setFieldValue("statusDetail", detail)
                          formik.setFieldValue(
                            "status",
                            normalizeStatusForPatch(
                              composeShareholderStatus("완료", detail),
                            ),
                          )
                        } else {
                          formik.setFieldValue("statusDetail", "")
                        }

                        return curId
                      })
                    }}
                    onId={(v) => {
                      setCompletionId(v)
                      setCompletionDoc((curDoc) => {
                        if (curDoc === "done" || curDoc === "hold") {
                          const detail = composeCompletionDetail(curDoc, v)
                          formik.setFieldValue("statusDetail", detail)
                          formik.setFieldValue(
                            "status",
                            normalizeStatusForPatch(
                              composeShareholderStatus("완료", detail),
                            ),
                          )
                        } else {
                          formik.setFieldValue("statusDetail", "")
                        }

                        return curDoc
                      })
                    }}
                  />
                </>
              ) : (
                <ChipRow role="group" aria-labelledby="label-detail" $dense>
                  {detailChipOptions.map((opt) => (
                    <StatusChip
                      key={opt}
                      type="button"
                      $active={formik.values.statusDetail === opt}
                      disabled={isSaveBusy}
                      onClick={() => {
                        formik.setFieldValue("statusDetail", opt)
                        formik.setFieldValue(
                          "status",
                          normalizeStatusForPatch(
                            composeShareholderStatus(
                              formik.values.statusPrimary,
                              opt,
                            ),
                          ),
                        )
                      }}>
                      {opt}
                    </StatusChip>
                  ))}
                </ChipRow>
              )}
              {!statusComplete && (
                <ValidationHint role="status">
                  {formik.values.statusPrimary === "완료"
                    ? "의결권 서류·신분증을 각각 선택해 주세요."
                    : "세부 상태를 선택해야 저장할 수 있습니다."}
                </ValidationHint>
              )}
            </Section>

            <Section>
              <SectionTitle>메모</SectionTitle>
              <StyledTextarea
                name="memo"
                value={removeTags(formik.values.memo)}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="메모를 입력하세요..."
                disabled={isSaveBusy}
              />
            </Section>

            {makerData && (
              <Section>
                <SectionTitle>사진 (1인 1장)</SectionTitle>
                {formik.values.image ? (
                  <img
                    src={formik.values.image}
                    alt=""
                    style={{
                      maxWidth: "100%",
                      maxHeight: 140,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <PhotoHint>등록된 사진이 없습니다.</PhotoHint>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={isSaveBusy || photoBusy}
                  style={{ marginTop: 8 }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (!file || !makerData) return
                    setPhotoBusy(true)
                    try {
                      const url = await uploadShareholderPhotoAndGetPublicUrl(
                        file,
                        makerData.list_id,
                        String(makerData.id),
                      )
                      formik.setFieldValue("image", url)
                      makerDataMutate(
                        { ...makerData, image: url },
                        {
                          onSuccess: () =>
                            toast.success("사진을 저장했습니다."),
                          onError: () =>
                            toast.error("사진 저장에 실패했습니다."),
                        },
                      )
                    } catch {
                      toast.error("사진을 올릴 수 없습니다.")
                    } finally {
                      setPhotoBusy(false)
                    }
                  }}
                />
                {formik.values.image ? (
                  <PhotoRemoveBtn
                    type="button"
                    disabled={isSaveBusy || photoBusy}
                    onClick={async () => {
                      if (!makerData) return
                      setPhotoBusy(true)
                      try {
                        await removeShareholderPhotoObject(
                          makerData.list_id,
                          String(makerData.id),
                          formik.values.image,
                        )
                        formik.setFieldValue("image", "")
                        makerDataMutate(
                          { ...makerData, image: null },
                          {
                            onSuccess: () =>
                              toast.success("사진을 삭제했습니다."),
                            onError: () =>
                              toast.error("삭제 반영에 실패했습니다."),
                          },
                        )
                      } catch {
                        toast.error("스토리지에서 삭제하지 못했습니다.")
                      } finally {
                        setPhotoBusy(false)
                      }
                    }}>
                    사진 삭제
                  </PhotoRemoveBtn>
                ) : null}
              </Section>
            )}

            <ButtonGroup>
              <ActionButton
                type="submit"
                variant="primary"
                disabled={!canSubmit}
                aria-busy={isSaveBusy}
                title={submitBlockReason}>
                {isSaveBusy ? (
                  <SubmitInner>
                    <CircularProgress
                      size={18}
                      thickness={5}
                      sx={{ color: "#fff" }}
                    />
                    저장 중…
                  </SubmitInner>
                ) : (
                  "수정 완료"
                )}
              </ActionButton>
              <ActionButton
                type="button"
                variant="secondary"
                disabled={isSaveBusy}
                onClick={() => {
                  if (isSaveBusy) return
                  setMakerDataUpdateIsModalOpen(false)
                }}>
                취소
              </ActionButton>
            </ButtonGroup>
          </ModalForm>
        </ModalScrollPane>
      </ModalBodyColumn>
    </>
  )
}

const ModalBodyColumn = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const ModalScrollPane = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
`

const ModalForm = styled.form`
  padding: 20px 24px 24px;

  @media (max-width: 768px) {
    padding: 16px 16px 20px;
  }
`

const ModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${COLORS.gray[100]};
  background: white;
  z-index: 2;

  @media (max-width: 768px) {
    padding: 16px;
  }
`

const HeaderTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${COLORS.gray[900]};
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;

  &::before {
    content: "";
    display: block;
    width: 4px;
    height: 16px;
    background: ${COLORS.blue[500]};
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  border-radius: 8px;
  color: ${COLORS.gray[500]};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
    transform: rotate(90deg);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const Section = styled.div`
  margin-bottom: 22px;
`

const SectionTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  margin: 0 0 10px;
`

const CurrentInfoCard = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  background: ${COLORS.gray[50]};
  border: 1px solid ${COLORS.gray[200]};
`

const SummaryName = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  line-height: 1.35;
  margin-bottom: 6px;
`

const SummaryMetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
`

const SummaryMetaText = styled.span`
  font-size: 0.8125rem;
  color: ${COLORS.gray[700]};
  font-weight: 600;
`

const SummaryMetaDot = styled.span`
  color: ${COLORS.gray[400]};
  font-weight: 600;
`

const SummaryStatusChip = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  word-break: break-word;
  background: ${({ status }) => getShareholderStatusChipBackground(status)};
  color: ${({ status }) => getShareholderStatusChipColor(status)};
`

const AddressLinkRow = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${COLORS.blue[700]};
  text-decoration: none;
  word-break: break-all;
  line-height: 1.4;

  &:hover {
    text-decoration: underline;
  }
`

const AddressPlain = styled.div`
  margin-top: 8px;
  font-size: 0.8125rem;
  color: ${COLORS.gray[600]};
  line-height: 1.4;
  word-break: break-all;
`

const HistoryNote = styled.p`
  margin: 10px 0 0;
  font-size: 0.75rem;
  color: ${COLORS.gray[500]};
`

const FieldLabel = styled.div`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  margin-bottom: 8px;
`

const RequiredMark = styled.span`
  color: ${COLORS.red[600]};
  font-weight: 700;
`

const ChipRow = styled.div<{ $dense?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${(p) => (p.$dense ? "6px" : "8px")};
`

const StatusChip = styled.button<{ $active: boolean }>`
  border: 1px solid ${(p) => (p.$active ? COLORS.blue[500] : COLORS.gray[200])};
  background: ${(p) => (p.$active ? COLORS.blue[50] : "white")};
  color: ${(p) => (p.$active ? COLORS.blue[800] : COLORS.gray[800])};
  font-size: 0.8125rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  line-height: 1.3;
  text-align: left;
  -webkit-tap-highlight-color: transparent;

  &:hover:not(:disabled) {
    border-color: ${COLORS.blue[300]};
    background: ${(p) => (p.$active ? COLORS.blue[50] : COLORS.gray[50])};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const StepHint = styled.p`
  margin: 0 0 8px;
  font-size: 0.75rem;
  color: ${COLORS.gray[600]};
  line-height: 1.4;
`

const ValidationHint = styled.p`
  margin: 10px 0 0;
  font-size: 0.8125rem;
  color: ${COLORS.red[600]};
  font-weight: 500;
`

const PhotoHint = styled.p`
  margin: 0 0 8px;
  font-size: 0.8125rem;
  color: ${COLORS.gray[600]};
`

const PhotoRemoveBtn = styled.button`
  display: inline-block;
  margin-top: 8px;
  padding: 6px 12px;
  font-size: 0.8125rem;
  color: ${COLORS.red[700]};
  background: ${COLORS.red[50]};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 8px;
  resize: vertical;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${COLORS.gray[400]};
  }

  &:hover {
    border-color: ${COLORS.blue[300]};
  }

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px ${COLORS.blue[100]};
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
  }
`

const SubmitInner = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`

const ActionButton = styled.button<{ variant: "primary" | "secondary" }>`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;

  background: ${({ variant }) =>
    variant === "primary" ? COLORS.blue[500] : "white"};
  color: ${({ variant }) =>
    variant === "primary" ? "white" : COLORS.gray[700]};
  border: 1px solid
    ${({ variant }) =>
      variant === "primary" ? COLORS.blue[500] : COLORS.gray[300]};
  box-shadow: 0 2px 4px
    ${({ variant }) =>
      variant === "primary"
        ? "rgba(59, 130, 246, 0.2)"
        : "rgba(0, 0, 0, 0.05)"};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: ${({ variant }) =>
      variant === "primary" ? COLORS.blue[600] : COLORS.gray[50]};
    border-color: ${({ variant }) =>
      variant === "primary" ? COLORS.blue[600] : COLORS.gray[400]};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.92;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: 10px 20px;
    font-size: 13px;
  }
`

export default MakerPatchModalChildren
