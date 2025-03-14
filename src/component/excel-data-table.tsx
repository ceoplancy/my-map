import styled from "@emotion/styled"
import { Excel } from "@/types/excel"
import { toast } from "react-toastify"
import { ContentCopy, Close } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"
import { nanoid } from "nanoid"
import { useState } from "react"
import Modal from "./modal"

// history 데이터 타입 정의 추가
type HistoryChange = {
  memo?: { original: string; modified: string }
  status?: { original: string; modified: string }
}

type HistoryItem = {
  modified_at: string
  modifier: string
  changes: HistoryChange
}

const ExcelDataTable = ({ data }: { data: Excel }) => {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  const handleAddressCopy = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    navigator.clipboard.writeText(data.address ?? "")
    toast.success("주소가 클립보드에 복사되었습니다")
  }

  if (!data) return null

  return (
    <TableContainer>
      <Table>
        <tbody>
          <TableRow>
            <TableHeader>주주번호</TableHeader>
            <TableCell>{data.id}</TableCell>
          </TableRow>
          <TableRow>
            <TableHeader>이름</TableHeader>
            <TableCell>{data.name}</TableCell>
          </TableRow>
          <TableRow>
            <TableHeader>주식수</TableHeader>
            <TableCell>{data.stocks?.toLocaleString()}</TableCell>
          </TableRow>
          <TableRow>
            <TableHeader>주소</TableHeader>
            <CopyableCell onClick={handleAddressCopy}>
              <div>{data.address}</div>
              <CopyIcon>
                <ContentCopy fontSize="small" />
              </CopyIcon>
            </CopyableCell>
          </TableRow>
          <TableRow>
            <TableHeader>상태</TableHeader>
            <TableCell>
              <StatusBadge status={data.status}>{data.status}</StatusBadge>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableHeader>회사명(구분1)</TableHeader>
            <TableCell>{data.company}</TableCell>
          </TableRow>
          <TableRow>
            <TableHeader>메모</TableHeader>
            <TableCell>{data.memo}</TableCell>
          </TableRow>
          <TableRow>
            <TableHeader>변경이력</TableHeader>
            <TableCell>
              <HistoryContainer>
                {Array.isArray(data.history) && data.history.length > 0 && (
                  <>
                    <LatestHistoryPreview
                      history={
                        data.history[data.history.length - 1] as HistoryItem
                      }
                    />
                    {data.history.length > 1 && (
                      <ViewMoreButton
                        onClick={() => setIsHistoryModalOpen(true)}>
                        이전 기록 보기 ({data.history.length - 1}건)
                      </ViewMoreButton>
                    )}
                  </>
                )}
              </HistoryContainer>

              {isHistoryModalOpen && (
                <Modal
                  open={isHistoryModalOpen}
                  setOpen={setIsHistoryModalOpen}
                  position="center">
                  <HistoryModalContent>
                    <HistoryModalHeader>
                      <ModalTitle>변경 이력</ModalTitle>
                      <CloseButton onClick={() => setIsHistoryModalOpen(false)}>
                        <Close fontSize="small" />
                      </CloseButton>
                    </HistoryModalHeader>
                    <HistoryList>
                      {Array.isArray(data.history) &&
                        data.history.map((history) => (
                          <HistoryCardItem
                            key={nanoid()}
                            history={history as HistoryItem}
                          />
                        ))}
                    </HistoryList>
                  </HistoryModalContent>
                </Modal>
              )}
            </TableCell>
          </TableRow>
        </tbody>
      </Table>
    </TableContainer>
  )
}

export default ExcelDataTable

const TableContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
`

const TableRow = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid ${COLORS.gray[100]};
  }

  // &:hover {
  //   background: ${COLORS.gray[50]};
  // }
`

const TableHeader = styled.td`
  width: 120px;
  min-width: 120px;
  padding: 16px 20px;
  font-size: 14px;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  background: ${COLORS.gray[50]};
  vertical-align: middle;
  word-break: keep-all;
  white-space: normal;
`

const TableCell = styled.td`
  padding: 16px 20px;
  font-size: 14px;
  color: ${COLORS.gray[900]};
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;
`

const CopyableCell = styled(TableCell)`
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;

  &:hover {
    background: ${COLORS.blue[50]};

    svg {
      opacity: 1;
    }
  }
`

const CopyIcon = styled.div`
  color: ${COLORS.blue[500]};
  opacity: 0;
  transition: opacity 0.2s ease;

  &:hover {
    color: ${COLORS.blue[600]};
  }
`

const StatusBadge = styled.span<{ status: string | null }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  background: ${({ status }) => {
    switch (status) {
      case "완료":
        return COLORS.green[50]
      case "미방문":
        return COLORS.blue[50]
      case "보류":
        return COLORS.yellow[50]
      case "실패":
        return COLORS.red[50]
      default:
        return COLORS.gray[50]
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case "완료":
        return COLORS.green[700]
      case "진행중":
        return COLORS.blue[700]
      case "보류":
        return COLORS.yellow[700]
      default:
        return COLORS.gray[700]
    }
  }};
`

const HistoryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const LatestHistoryPreview = ({ history }: { history: HistoryItem }) => {
  return (
    <PreviewContainer>
      <PreviewHeader>
        {history.modifier && <ModifierName>{history.modifier}</ModifierName>}
        {history?.modified_at && <TimeStamp>{history.modified_at}</TimeStamp>}
      </PreviewHeader>
    </PreviewContainer>
  )
}

const ViewMoreButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.blue[500]};
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background: ${COLORS.blue[50]};
  }
`

const HistoryModalContent = styled.div`
  background: white;
  border-radius: 16px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${COLORS.gray[50]};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${COLORS.gray[200]};
    border-radius: 4px;

    &:hover {
      background: ${COLORS.gray[300]};
    }
  }
`

const HistoryModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${COLORS.gray[100]};
`

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${COLORS.gray[900]};
  margin: 0;
`

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  overflow-y: auto;
`

const HistoryCard = styled.div`
  border-bottom: 1px solid ${COLORS.gray[100]};
  padding: 16px 0;

  &:last-child {
    border-bottom: none;
  }
`

const HistoryHeader = styled.div`
  margin-bottom: 12px;
`

const ModifierInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
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
  line-height: 1.8;
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

const ChangeText = styled.span<{ highlight?: boolean }>`
  font-size: 14px;
  color: ${(props) => (props.highlight ? COLORS.blue[700] : COLORS.gray[700])};
`

const ArrowIcon = styled.span`
  color: ${COLORS.gray[400]};
  font-size: 14px;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: ${COLORS.gray[500]};
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
  }
`

// 변경 이력 카드 컴포넌트 분리
const HistoryCardItem = ({ history }: { history: HistoryItem }) => {
  return (
    <HistoryCard>
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
              <ChangeText>
                {history.changes.memo.original || "(없음)"}
              </ChangeText>
              <ArrowIcon>→</ArrowIcon>
              <ChangeText highlight>
                {history.changes.memo.modified || "(없음)"}
              </ChangeText>
            </ChangeContent>
          </ChangeItem>
        )}
        {history.changes?.status && (
          <ChangeItem>
            <FieldName>상태</FieldName>
            <ChangeContent>
              <StatusBadge status={history.changes.status.original}>
                {history.changes.status.original}
              </StatusBadge>
              <ArrowIcon>→</ArrowIcon>
              <StatusBadge status={history.changes.status.modified}>
                {history.changes.status.modified}
              </StatusBadge>
            </ChangeContent>
          </ChangeItem>
        )}
      </HistoryDetails>
    </HistoryCard>
  )
}

// 스타일 컴포넌트 추가
const PreviewContainer = styled.div`
  padding: 8px 12px;
  background: ${COLORS.gray[50]};
  border-radius: 8px;
`

const PreviewHeader = styled.div`
  display: flex;
  gap: 4px;
`
