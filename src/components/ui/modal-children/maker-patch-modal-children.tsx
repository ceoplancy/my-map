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
import MarkerDetailTable, { type HistoryItem } from "../marker-detail-table"
import { toast } from "react-toastify"
import { Json } from "@/types/db"
import { useGetUserData } from "@/api/auth"
import { format } from "date-fns"
import Select from "@/components/ui/select"
import { hasPatchChanges, normalizeStatusForPatch } from "@/lib/makerPatchForm"
import {
  composeShareholderStatus,
  PRIMARY_STATUS_OPTIONS,
  splitShareholderStatus,
  STATUS_DETAIL_OPTIONS,
  type PrimaryStatus,
} from "@/lib/shareholderStatus"

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

  /** 지도 주주 마커: API로 불러온 변경 이력 */
  history?: HistoryItem[]

  /** 부모 `usePatchShareholder`의 isPending (버튼 로딩 동기화) */
  mutateIsPending?: boolean

  /** 저장 요청 중일 때 true — 모달 바깥 클릭·닫기 방지용 */
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
  const saveSucceededRef = useRef(false)

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
      if (statusDetail.length === 0) {
        toast.error("상세 상태를 선택해야 저장할 수 있습니다.")

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
        statusPrimary: splitShareholderStatus(makerData.status).primary,
        statusDetail: splitShareholderStatus(makerData.status).detail,
        memo: makerData.memo ?? "",
        stocks: makerData.stocks ?? 0,
        image: makerData.image ?? "",
        history: makerData.history ?? [],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- makerData 변경 시만 폼 동기화
  }, [makerData])

  const hasEditableChanges = useMemo(
    () =>
      makerData
        ? hasPatchChanges(makerData, {
            status: composeShareholderStatus(
              formik.values.statusPrimary,
              formik.values.statusDetail ?? "",
            ),
            memo: formik.values.memo,
          })
        : false,
    // 편집 가능 필드는 status·memo뿐 — statusPrimary/statusDetail/memo만 추적
    [
      makerData,
      formik.values.statusPrimary,
      formik.values.statusDetail,
      formik.values.memo,
    ],
  )

  const canSubmit = hasEditableChanges && !isSaveBusy

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
      <ModalContainer>
        <ModalContent onSubmit={formik.handleSubmit}>
          <Section>
            <SectionTitle>현재 정보</SectionTitle>
            {makerData && (
              <MarkerDetailTable data={makerData} history={history} />
            )}
          </Section>

          <Section>
            <SectionTitle>상태 변경</SectionTitle>
            <SelectWrapper>
              <StyledSelect
                name="statusPrimary"
                value={formik.values.statusPrimary || "미방문"}
                onChange={(e) => {
                  const primary = e.target.value as PrimaryStatus
                  formik.setFieldValue("statusPrimary", primary)
                  const firstDetail = STATUS_DETAIL_OPTIONS[primary][0] ?? ""
                  formik.setFieldValue("statusDetail", firstDetail)
                  formik.setFieldValue(
                    "status",
                    normalizeStatusForPatch(
                      composeShareholderStatus(primary, firstDetail),
                    ),
                  )
                }}
                onBlur={formik.handleBlur}
                disabled={isSaveBusy}>
                {PRIMARY_STATUS_OPTIONS.map((statusOpt) => (
                  <option key={statusOpt} value={statusOpt}>
                    {statusOpt}
                  </option>
                ))}
              </StyledSelect>
            </SelectWrapper>
            <SelectWrapper style={{ marginTop: "0.5rem" }}>
              <StyledSelect
                name="statusDetail"
                value={formik.values.statusDetail || ""}
                onChange={(e) => {
                  formik.setFieldValue("statusDetail", e.target.value)
                  formik.setFieldValue(
                    "status",
                    normalizeStatusForPatch(
                      composeShareholderStatus(
                        formik.values.statusPrimary,
                        e.target.value,
                      ),
                    ),
                  )
                }}
                onBlur={formik.handleBlur}
                disabled={isSaveBusy}>
                {(STATUS_DETAIL_OPTIONS[formik.values.statusPrimary] ?? []).map(
                  (detailOpt) => (
                    <option key={detailOpt} value={detailOpt}>
                      {detailOpt}
                    </option>
                  ),
                )}
              </StyledSelect>
            </SelectWrapper>
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

          <ButtonGroup>
            <ActionButton
              type="submit"
              variant="primary"
              disabled={!canSubmit}
              aria-busy={isSaveBusy}
              title={
                isSaveBusy
                  ? undefined
                  : !hasEditableChanges
                    ? "상태 또는 메모를 변경한 뒤 저장할 수 있습니다"
                    : undefined
              }>
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
        </ModalContent>
      </ModalContainer>
    </>
  )
}

const ModalContainer = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  height: 100%;
  overflow-y: auto;
  max-width: 95vw;
  max-height: 90vh;
  width: 100%;

  user-select: none;
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

  @media (max-width: 768px) {
    border-radius: 12px;
  }
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${COLORS.gray[100]};
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;

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

const ModalContent = styled.form`
  padding: 24px;
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: 16px;
  }
`

const Section = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  margin-bottom: 12px;
`

const SelectWrapper = styled.div`
  position: relative;
`

const StyledSelect = styled(Select)`
  width: 100%;
  padding: 12px 2rem 12px 16px;
  font-size: 14px;
  min-height: 48px;
  color: ${COLORS.gray[900]};

  &:hover {
    border-color: ${COLORS.blue[300]};
  }

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px ${COLORS.blue[100]};
  }

  @media (max-width: 768px) {
    padding: 10px 14px;
    font-size: 13px;
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
  margin-top: 32px;

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
