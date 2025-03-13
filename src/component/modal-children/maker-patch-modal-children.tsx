import styled from "@emotion/styled"
import { Excel } from "@/types/excel"
import { Dispatch, SetStateAction } from "react"
import { UseMutateFunction } from "react-query"
import { useFormik } from "formik"
import { removeTags } from "@/lib/utils"
import { Close as CloseIcon } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"
import ExcelDataTable from "../excel-data-table"
import { toast } from "react-toastify"

interface MakerPatchModalChildrenProps {
  makerData: Excel
  makerDataMutate: UseMutateFunction<
    void,
    unknown,
    {
      id: number
      patchData: Excel
    },
    unknown
  >
  setMakerDataUpdateIsModalOpen: Dispatch<SetStateAction<boolean>>
}

const MakerPatchModalChildren = ({
  makerData,
  makerDataMutate,
  setMakerDataUpdateIsModalOpen,
}: MakerPatchModalChildrenProps) => {
  const formik = useFormik({
    initialValues: makerData,
    onSubmit: (values) => {
      makerDataMutate(
        {
          id: makerData.id,
          patchData: values,
        },
        {
          onSuccess: () => {
            toast.success("주주 정보가 수정되었습니다.")
          },
          onError: () => {
            toast.error("주주 정보 수정에 실패했습니다.")
          },
          onSettled: () => {
            setMakerDataUpdateIsModalOpen(false)
          },
        },
      )
    },
  })

  return (
    <ModalContainer>
      <ModalHeader>
        <HeaderTitle>주주 정보 수정</HeaderTitle>
        <CloseButton onClick={() => setMakerDataUpdateIsModalOpen(false)}>
          <CloseIcon />
        </CloseButton>
      </ModalHeader>

      <ModalContent>
        <Section>
          <SectionTitle>현재 정보</SectionTitle>
          <ExcelDataTable data={makerData} />
        </Section>

        <form onSubmit={formik.handleSubmit}>
          <Section>
            <SectionTitle>상태 변경</SectionTitle>
            <SelectWrapper>
              {formik.values.status ? (
                <StyledSelect
                  name="status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}>
                  <option value="미방문">미방문</option>
                  <option value="완료">완료</option>
                  <option value="실패">실패</option>
                </StyledSelect>
              ) : (
                <ErrorMessage>
                  상태 정보가 존재하지 않습니다. 관리자에게 문의하세요.
                </ErrorMessage>
              )}
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
            />
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
        </form>
      </ModalContent>
    </ModalContainer>
  )
}

const ModalContainer = styled.div`
  max-width: 90vw;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
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
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${COLORS.gray[100]};
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
`

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  border-radius: 8px;
  color: ${COLORS.gray[500]};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
    transform: rotate(90deg);
  }
`

const ModalContent = styled.div`
  padding: 24px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${COLORS.gray[200]};
    border-radius: 3px;

    &:hover {
      background: ${COLORS.gray[300]};
    }
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

const StyledSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 8px;
  background: white;
  color: ${COLORS.gray[900]};
  cursor: pointer;
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
`

const ActionButton = styled.button<{ variant: "primary" | "secondary" }>`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

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
    box-shadow: 0 4px 8px
      ${({ variant }) =>
        variant === "primary"
          ? "rgba(59, 130, 246, 0.3)"
          : "rgba(0, 0, 0, 0.1)"};
  }

  &:active {
    transform: translateY(0);
  }
`

const ErrorMessage = styled.div`
  color: ${COLORS.gray[500]};
  font-size: 14px;
  padding: 12px;
  background: ${COLORS.gray[50]};
  border-radius: 8px;
  text-align: center;
`

export default MakerPatchModalChildren
