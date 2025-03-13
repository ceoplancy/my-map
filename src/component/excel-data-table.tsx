import styled from "@emotion/styled"
import { Excel } from "@/types/excel"
import { toast } from "react-toastify"
import { ContentCopy } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"

const ExcelDataTable = ({ data }: { data: Excel }) => {
  if (!data) return null

  const handleAddressCopy = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    navigator.clipboard.writeText(data.address ?? "")
    toast.success("주소가 클립보드에 복사되었습니다")
  }

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
                {Array.isArray(data.history) &&
                  data.history.map((x) => (
                    <HistoryItem key={x as string}>{x as string}</HistoryItem>
                  ))}
              </HistoryContainer>
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
  max-width: 100%;
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

  &:hover {
    background: ${COLORS.gray[50]};
  }
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

const HistoryItem = styled.div`
  font-size: 13px;
  color: ${COLORS.gray[600]};
  padding: 8px 12px;
  background: ${COLORS.gray[50]};
  border-radius: 6px;
  line-height: 1.4;

  &:hover {
    background: ${COLORS.gray[100]};
  }
`
