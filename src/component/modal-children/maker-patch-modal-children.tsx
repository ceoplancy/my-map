import styled from "@emotion/styled"
import { Excel } from "@/types/excel"
import { Dispatch, SetStateAction, useEffect } from "react"
import { ShareholderExternalMapLinks } from "@/components/shareholder/ShareholderExternalMapLinks"
import { ShareholderIdCardPanel } from "@/components/shareholder/ShareholderIdCardPanel"
import { ShareholderPhotoUploadField } from "@/components/shareholder/ShareholderPhotoUploadField"
import { UseMutateFunction } from "react-query"
import { useFormik } from "formik"
import { removeTags } from "@/lib/utils"
import { Close as CloseIcon } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"
import ExcelDataTable from "../excel-data-table"
import ShareholderStatusSelect from "@/components/shareholder/ShareholderStatusSelect"
import { toast } from "react-toastify"
import { useGetUserData } from "@/api/auth"
import { format } from "date-fns"
import {
  buildHistoryChanges,
  getHistoryMergeLossInfo,
  mergeHistoryWithNewEntry,
  normalizeStatusForHistory,
} from "@/lib/excelHistory"
import type { HistoryItem } from "@/types/excelHistory"

interface MakerPatchModalChildrenProps {
  makerData: Excel | null
  makerDataMutate: UseMutateFunction<void, unknown, Excel, unknown>
  setMakerDataUpdateIsModalOpen: Dispatch<SetStateAction<boolean>>
}

const MakerPatchModalChildren = ({
  makerData,
  makerDataMutate,
  setMakerDataUpdateIsModalOpen,
}: MakerPatchModalChildrenProps) => {
  const { data: user } = useGetUserData()

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
      memo: makerData?.memo ?? "",
      phone: makerData?.phone ?? "",
      special_notes: makerData?.special_notes ?? "",
      stocks: makerData?.stocks ?? 0,
      image: makerData?.image ?? "",
      history: makerData?.history ?? [],
    },
    onSubmit: (values) => {
      if (!makerData) return

      const status = normalizeStatusForHistory(values.status)
      const memoNext = values.memo ?? ""
      const phoneNext = values.phone ?? ""
      const notesNext = values.special_notes ?? ""
      const imageNext = values.image ?? ""

      const changes = buildHistoryChanges(
        {
          status: makerData.status,
          memo: makerData.memo,
          phone: makerData.phone,
          special_notes: makerData.special_notes,
          image: makerData.image,
        },
        {
          status,
          memo: memoNext,
          phone: phoneNext,
          special_notes: notesNext,
          image: imageNext,
        },
      )

      if (Object.keys(changes).length === 0) {
        toast.info("변경된 내용이 없습니다.")

        return
      }

      const name = user?.user?.user_metadata?.name
      const email = user?.user?.email ?? ""
      const modifier = name
        ? `${name} (${email})`
        : email
          ? `미확인 (${email})`
          : "미확인"

      const modified_at = format(new Date(), "yyyy년 MM월 dd일 HH시 mm분 ss초")

      const entry: HistoryItem = {
        modifier,
        modified_at,
        changes,
        ...(user?.user?.id ? { user_id: user.user.id } : {}),
      }

      const loss = getHistoryMergeLossInfo(makerData.history)
      if (loss.losesNonArrayShape || loss.droppedEntryCount > 0) {
        const lines: string[] = []
        if (loss.losesNonArrayShape) {
          lines.push(
            "변경이력이 표준 형식(배열)이 아니어서, 저장 시 기존 이력이 유지되지 않을 수 있습니다.",
          )
        }
        if (loss.droppedEntryCount > 0) {
          lines.push(
            `예전 형식의 변경이력 ${loss.droppedEntryCount}건은 이번 저장 후 목록에 남지 않습니다.`,
          )
        }
        const ok = window.confirm(`${lines.join("\n\n")}\n\n그래도 저장할까요?`)
        if (!ok) {
          return
        }
      }

      const history = mergeHistoryWithNewEntry(makerData.history, entry)

      const patchData = {
        ...values,
        status,
        memo: memoNext,
        phone: phoneNext,
        special_notes: notesNext,
        image: imageNext,
        history,
      } as Excel

      makerDataMutate(patchData, {
        onSuccess: () => {
          toast.success("주주 정보가 수정되었습니다.")
        },
        onError: () => {
          toast.error(
            "주주 정보 수정에 실패했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
          )
        },
        onSettled: () => {
          setMakerDataUpdateIsModalOpen(false)
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
        memo: makerData.memo ?? "",
        phone: makerData.phone ?? "",
        special_notes: makerData.special_notes ?? "",
        stocks: makerData.stocks ?? 0,
        image: makerData.image ?? "",
        history: makerData.history ?? [],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- makerData 변경 시만 폼 동기화
  }, [makerData])

  return (
    <>
      <ModalHeader>
        <HeaderTitle>주주 정보 수정</HeaderTitle>
        <CloseButton onClick={() => setMakerDataUpdateIsModalOpen(false)}>
          <CloseIcon />
        </CloseButton>
      </ModalHeader>
      <ModalContainer>
        <ModalContent onSubmit={formik.handleSubmit}>
          <Section>
            <SectionTitle>현재 정보</SectionTitle>
            {makerData && <ExcelDataTable data={makerData} />}
          </Section>

          <Section>
            <SectionTitle>상태 변경</SectionTitle>
            <ShareholderStatusSelect
              idPrefix="map-patch-status"
              value={formik.values.status || "미방문"}
              onChange={(next) => {
                void formik.setFieldValue("status", next)
              }}
            />
          </Section>

          <Section>
            <SectionTitle>휴대폰</SectionTitle>
            <StyledInput
              type="tel"
              name="phone"
              inputMode="tel"
              autoComplete="tel"
              value={formik.values.phone ?? ""}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="010-0000-0000"
            />
          </Section>

          <Section>
            <SectionTitle>메모</SectionTitle>
            <StyledTextarea
              name="memo"
              value={removeTags(formik.values.memo)}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="메모를 입력하세요..."
            />
          </Section>

          <Section>
            <SectionTitle>특이사항</SectionTitle>
            <StyledTextarea
              name="special_notes"
              value={removeTags(formik.values.special_notes ?? "")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="특이사항을 입력하세요..."
            />
          </Section>

          <Section>
            <SectionTitle>카카오맵</SectionTitle>
            <ShareholderExternalMapLinks
              lat={formik.values.lat}
              lng={formik.values.lng}
              name={formik.values.name}
              address={formik.values.address}
            />
          </Section>

          <Section>
            <SectionTitle>사진</SectionTitle>
            {makerData?.id ? (
              <ShareholderPhotoUploadField
                shareholderId={makerData.id}
                imageUrl={formik.values.image}
                onChangeUrl={(url) => void formik.setFieldValue("image", url)}
              />
            ) : (
              <MutedLine>저장된 주주만 사진을 올릴 수 있습니다.</MutedLine>
            )}
          </Section>

          <Section>
            <SectionTitle>신분증 (QR · 본인 제출)</SectionTitle>
            {makerData?.id ? (
              <ShareholderIdCardPanel
                excelId={makerData.id}
                shareholderName={makerData.name}
              />
            ) : (
              <MutedLine>
                저장된 주주만 신분증 QR을 사용할 수 있습니다.
              </MutedLine>
            )}
          </Section>

          <ButtonGroup>
            <ActionButton type="submit" variant="primary">
              수정 완료
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => setMakerDataUpdateIsModalOpen(false)}>
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
  display: flex;
  flex-direction: column;

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

  @media (max-width: 640px) {
    border-radius: 0;
    max-width: 100%;
    max-height: 100%;
    min-height: 0;
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
  padding: 10px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  color: ${COLORS.gray[500]};
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
    transform: rotate(90deg);
  }
`

const ModalContent = styled.form`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    padding: 16px;
    padding-bottom: max(20px, env(safe-area-inset-bottom, 0px));
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

const MutedLine = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${COLORS.gray[500]};
`

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${COLORS.blue[300]};
  }

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px ${COLORS.blue[100]};
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

  &:hover {
    transform: translateY(-1px);
    background: ${({ variant }) =>
      variant === "primary" ? COLORS.blue[600] : COLORS.gray[50]};
    border-color: ${({ variant }) =>
      variant === "primary" ? COLORS.blue[600] : COLORS.gray[400]};
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: 14px 20px;
    font-size: 16px;
  }
`

export default MakerPatchModalChildren
