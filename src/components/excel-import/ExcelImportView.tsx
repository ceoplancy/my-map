import { ChangeEvent, FormEvent } from "react"
import styled from "styled-components"
import Font from "@/component/font"
import DotSpinner from "@/component/dot-spinner"
import { Excel } from "@/types/excel"

interface Progress {
  current: number
  total: number
}

interface ExcelImportViewProps {
  fileName: string
  failCount: number
  failData: Excel[]
  loading: boolean
  progress: Progress
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  onClearFileName: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onExport: () => void
}

interface FailureTableProps {
  failData: Excel[]
}

const FailureTable = ({ failData }: FailureTableProps) => (
  <table style={{ marginTop: "2rem" }}>
    <thead>
      <tr>
        <StyledTh>주주번호</StyledTh>
        <StyledTh>이름</StyledTh>
        <StyledTh>주식수</StyledTh>
        <StyledTh>주소</StyledTh>
        <StyledTh>상태</StyledTh>
        <StyledTh>회사명</StyledTh>
        <StyledTh>메모</StyledTh>
        <StyledTh>변경이력</StyledTh>
      </tr>
    </thead>
    <tbody>
      {failData.map((data, index) => (
        <tr key={index}>
          <StyledTd>{data.id}</StyledTd>
          <StyledTd>{data.name}</StyledTd>
          <StyledTd>{data.stocks}</StyledTd>
          <StyledTd>{data.address}</StyledTd>
          <StyledTd>{data.status}</StyledTd>
          <StyledTd>{data.company}</StyledTd>
          <StyledTd>{data.memo}</StyledTd>
          <StyledTd>
            {Array.isArray(data.history) &&
              data.history
                .map((item) =>
                  typeof item === "string" ? item : JSON.stringify(item),
                )
                .join(", ")}
          </StyledTd>
        </tr>
      ))}
    </tbody>
  </table>
)

export const ExcelImportView = ({
  fileName,
  failCount,
  failData,
  loading,
  progress,
  onFileChange,
  onClearFileName,
  onSubmit,
  onExport,
}: ExcelImportViewProps) => {
  return (
    <Frame>
      <Header>
        <Font fontSize="2.4rem" margin="4rem 0 0 0">
          엑셀 데이터 불러오기
        </Font>
        <Divider />
      </Header>

      <StyledForm onSubmit={onSubmit}>
        {!fileName ? (
          <StyledLabel>
            <span>엑셀 파일 업로드 시 주소 변환 작업이 진행됩니다.</span>
            <StyledInput type="file" required onChange={onFileChange} />
          </StyledLabel>
        ) : (
          <FileNameDisplay>
            <Font fontSize="1.6rem" margin="1rem 0 0 0">
              {fileName}
            </Font>
            <ClearButton onClick={onClearFileName}>X</ClearButton>
          </FileNameDisplay>
        )}

        <StyledButton type="submit">UPLOAD</StyledButton>
      </StyledForm>

      {loading && (
        <LoadingContainer>
          <DotSpinner />
          {progress.total > 0 && (
            <ProgressDisplay>
              <Font fontSize="1.6rem" margin="0 0 0.5rem 0">
                주소 변환 진행 중...
              </Font>
              <Font fontSize="1.6rem">
                {progress.current}/{progress.total}
              </Font>
            </ProgressDisplay>
          )}
        </LoadingContainer>
      )}

      {failCount > 0 && (
        <>
          <Divider margin="3rem 0" />
          <FailureSection>
            <FailureHeader>
              <Font fontSize="2rem">주소 변환 실패 갯수 : {failCount}</Font>
              <StyledExportButton onClick={onExport}>export</StyledExportButton>
            </FailureHeader>
            <FailureTable failData={failData} />
          </FailureSection>
        </>
      )}
    </Frame>
  )
}

const Frame = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0;
`

const Header = styled.div`
  width: 100%;
  text-align: center;
`

const Divider = styled.div<{ margin?: string }>`
  width: 100%;
  height: 1px;
  background-color: #ccc;
  margin: ${({ margin }) => margin || "1rem 0"};
`

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  background-color: #f0f8ff;
  border: 2px dashed #000;
  border-radius: 10px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  text-align: center;
`

const StyledInput = styled.input`
  display: none;
`

const StyledLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  padding: 1rem;
  border: 2px solid #000;
  border-radius: 10px;
  background-color: white;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #e6f7ff;
  }
`

const FileNameDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
`

const ClearButton = styled.button`
  background: none;
  border: none;
  font-weight: bold;
  cursor: pointer;
  padding: 0.5rem;
  margin-top: 1rem;

  &:hover {
    opacity: 0.7;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  margin-top: 2rem;
`

const ProgressDisplay = styled.div`
  text-align: center;
`

const FailureSection = styled.div`
  width: 100%;
  max-width: 800px;
  margin-top: 2rem;
`

const FailureHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
`

const StyledButton = styled.button`
  margin-top: 2rem;
  padding: 0.5rem 1rem;
  background-color: #000;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #333;
  }
`

const StyledExportButton = styled(StyledButton)`
  margin-top: 0;
`

const StyledTh = styled.th`
  padding: 1rem;
  font-size: 1.6rem;
  text-align: center;
  border: 1px solid #ccc;
  background-color: #f5f5f5;
`

const StyledTd = styled.td`
  padding: 1rem;
  font-size: 1.4rem;
  text-align: center;
  border: 1px solid #ccc;
`
