import styled from "@emotion/styled"
import type { MapMarkerData } from "@/types/map"
import type { ImportSpreadsheetRow } from "@/types/importSpreadsheet"
import { Close, Directions } from "@mui/icons-material"
import { COLORS } from "@/styles/global-style"
import { nanoid } from "nanoid"
import { useState } from "react"
import ModalComponent from "./modal"
import {
  getShareholderStatusChipBackground,
  getShareholderStatusChipColor,
} from "@/lib/shareholderStatus"
import { getKakaoMapLinkUrl } from "@/lib/kakaoMapLinks"

export type HistoryChange = {
  memo?: { original: string; modified: string }
  phone?: { original: string; modified: string }
  status?: { original: string; modified: string }
}

export type HistoryItem = {
  modified_at: string
  modifier: string
  changes: HistoryChange
}

type MarkerDetailSource = MapMarkerData | ImportSpreadsheetRow

interface MarkerDetailTableProps {
  data: MarkerDetailSource
  history?: HistoryItem[]
  historyLoading?: boolean
  mobileScrollable?: boolean
  hideShareholderId?: boolean
  hideSummaryFields?: boolean

  /** 지도 요약과 함께 쓸 때: 주소·메모 등 행에서 왼쪽 제목 칸 생략 */
  hideRowLabels?: boolean
}

const MarkerDetailTable = ({
  data,
  history: historyProp,
  historyLoading = false,
  mobileScrollable = true,
  hideShareholderId = false,
  hideSummaryFields = false,
  hideRowLabels = false,
}: MarkerDetailTableProps) => {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const history =
    historyProp ??
    (Array.isArray((data as unknown as { history?: unknown }).history)
      ? (data as unknown as { history: HistoryItem[] }).history
      : [])

  if (!data) return null

  const kakaoMapUrl = getKakaoMapLinkUrl({
    name: data.name,
    address: data.address,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
  })
  const addressDisplay =
    data.address?.trim() || (kakaoMapUrl ? "카카오맵 길찾기" : "-")

  const sh = data as MapMarkerData
  const gcs =
    "geocode_status" in sh && sh.geocode_status ? sh.geocode_status : undefined
  const originalAddr =
    "address_original" in sh && sh.address_original?.trim()
      ? sh.address_original.trim()
      : ""
  const showOriginalRow =
    !!originalAddr &&
    (gcs === "failed" ||
      gcs === "pending" ||
      (!!sh.address?.trim() && originalAddr !== sh.address.trim()))

  const addressRow = (
    <TableRow key="addr" $hideLabels={hideRowLabels}>
      {!hideRowLabels && <TableHeader>주소</TableHeader>}
      <AddressLinkCell
        colSpan={hideRowLabels ? 2 : undefined}
        $hideLabels={hideRowLabels}>
        {kakaoMapUrl ? (
          <AddressAnchor
            $hideLabels={hideRowLabels}
            href={kakaoMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="카카오맵에서 열기">
            <AddressText>{addressDisplay}</AddressText>
            <MapLinkIcon>
              <Directions fontSize="small" />
            </MapLinkIcon>
          </AddressAnchor>
        ) : (
          <AddressPlain $hideLabels={hideRowLabels}>
            {addressDisplay}
          </AddressPlain>
        )}
      </AddressLinkCell>
    </TableRow>
  )

  const originalAddressRow = showOriginalRow ? (
    <TableRow key="addr-orig" $hideLabels={hideRowLabels}>
      {!hideRowLabels && <TableHeader>원본 주소(명부)</TableHeader>}
      <TableCell
        colSpan={hideRowLabels ? 2 : undefined}
        $hideLabels={hideRowLabels}>
        <AddressPlain $hideLabels={hideRowLabels}>{originalAddr}</AddressPlain>
      </TableCell>
    </TableRow>
  ) : null

  const phoneVal =
    "phone" in (data as MapMarkerData) ? (data as MapMarkerData).phone : null
  const phoneRow =
    phoneVal != null && String(phoneVal).trim() !== "" ? (
      <TableRow key="phone" $hideLabels={hideRowLabels}>
        {!hideRowLabels && <TableHeader>휴대폰</TableHeader>}
        <TableCell
          colSpan={hideRowLabels ? 2 : undefined}
          $hideLabels={hideRowLabels}>
          {String(phoneVal).trim()}
        </TableCell>
      </TableRow>
    ) : null

  const memoRow = (
    <TableRow key="memo" $hideLabels={hideRowLabels}>
      {!hideRowLabels && <TableHeader>메모</TableHeader>}
      <TableCell
        colSpan={hideRowLabels ? 2 : undefined}
        $hideLabels={hideRowLabels}>
        {data.memo}
      </TableCell>
    </TableRow>
  )

  const historyRow = (
    <TableRow key="hist" $hideLabels={hideRowLabels}>
      {!hideRowLabels && <TableHeader>변경이력</TableHeader>}
      <TableCell
        colSpan={hideRowLabels ? 2 : undefined}
        $hideLabels={hideRowLabels}>
        {historyLoading ? (
          <HistorySkeleton>
            <SkeletonBar style={{ width: "60%" }} />
          </HistorySkeleton>
        ) : history.length > 0 ? (
          <HistoryButton
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}>
            변경 이력 보기 ({history.length}건)
          </HistoryButton>
        ) : (
          <HistoryEmptyText>변경 이력 없음</HistoryEmptyText>
        )}

        {isHistoryModalOpen && (
          <HistoryModal
            open={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            history={history}
          />
        )}
      </TableCell>
    </TableRow>
  )

  return (
    <TableContainer
      $mobileScrollable={mobileScrollable}
      $hideRowLabels={hideRowLabels}>
      <Table $hideRowLabels={hideRowLabels}>
        <tbody>
          {!hideShareholderId && (
            <TableRow $hideLabels={hideRowLabels}>
              {!hideRowLabels && <TableHeader>주주번호</TableHeader>}
              <TableCell
                colSpan={hideRowLabels ? 2 : undefined}
                $hideLabels={hideRowLabels}>
                {String(data.id)}
              </TableCell>
            </TableRow>
          )}
          {!hideSummaryFields && (
            <TableRow $hideLabels={hideRowLabels}>
              <TableHeader>이름</TableHeader>
              <TableCell>{data.name}</TableCell>
            </TableRow>
          )}
          {!hideSummaryFields && (
            <TableRow $hideLabels={hideRowLabels}>
              <TableHeader>주식수</TableHeader>
              <TableCell>{data.stocks?.toLocaleString()}</TableCell>
            </TableRow>
          )}
          {addressRow}
          {originalAddressRow}
          {!hideSummaryFields && (
            <TableRow $hideLabels={hideRowLabels}>
              <TableHeader>상태</TableHeader>
              <TableCell>
                <StatusBadge status={data.status}>{data.status}</StatusBadge>
              </TableCell>
            </TableRow>
          )}
          {!hideSummaryFields && (
            <TableRow $hideLabels={hideRowLabels}>
              <TableHeader>회사명(구분1)</TableHeader>
              <TableCell>{data.company}</TableCell>
            </TableRow>
          )}
          {phoneRow}
          {historyRow}
          {memoRow}
        </tbody>
      </Table>
    </TableContainer>
  )
}

export default MarkerDetailTable

const TableContainer = styled.div<{
  $mobileScrollable: boolean
  $hideRowLabels?: boolean
}>`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;

  ${(p) =>
    p.$hideRowLabels &&
    `
    box-shadow: none;
    border-radius: 0;
  `}

  @media screen and (max-width: 768px) {
    border-radius: 0;
    box-shadow: none;
    max-height: ${(p) => (p.$mobileScrollable ? "300px" : "none")};
    overflow-y: ${(p) => (p.$mobileScrollable ? "auto" : "visible")};
  }
`

const Table = styled.table<{ $hideRowLabels?: boolean }>`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;

  @media screen and (max-width: 768px) {
    display: block;

    tbody {
      display: block;
    }
  }
`

const TableRow = styled.tr<{ $hideLabels?: boolean }>`
  &:not(:last-child) {
    border-bottom: 1px solid ${COLORS.gray[100]};
  }

  @media screen and (max-width: 768px) {
    display: flex;
    flex-direction: column;
    padding: ${(p) => (p.$hideLabels ? "12px 0" : "16px 0")};
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

  @media screen and (max-width: 768px) {
    width: 100%;
    min-width: 100%;
    padding: 0 16px 4px 16px;
    background: none;
    font-size: 13px;
    color: ${COLORS.gray[500]};
  }
`

const TableCell = styled.td<{ $hideLabels?: boolean }>`
  padding: ${(p) => (p.$hideLabels ? "10px 0" : "16px 20px")};
  font-size: 14px;
  color: ${COLORS.gray[900]};
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;

  @media screen and (max-width: 768px) {
    padding: ${(p) => (p.$hideLabels ? "0" : "0 16px")};
    font-size: 15px;
  }
`

const AddressLinkCell = styled(TableCell)`
  padding: 0;
  vertical-align: middle;

  @media screen and (max-width: 768px) {
    padding: 0;
  }
`

const AddressAnchor = styled.a<{ $hideLabels?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: ${(p) => (p.$hideLabels ? "10px 0" : "16px 20px")};
  cursor: pointer;
  color: inherit;
  text-decoration: none;
  border-radius: 4px;

  @media screen and (max-width: 768px) {
    padding: ${(p) => (p.$hideLabels ? "0" : "0 16px")};
  }

  &:hover {
    background: ${COLORS.blue[50]};

    svg {
      color: ${COLORS.blue[600]};
    }
  }
`

const AddressText = styled.div`
  flex: 1;
  min-width: 0;
  word-break: break-all;
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 14px;
  color: ${COLORS.gray[900]};

  @media screen and (max-width: 768px) {
    font-size: 15px;
  }
`

const AddressPlain = styled.div<{ $hideLabels?: boolean }>`
  padding: ${(p) => (p.$hideLabels ? "10px 0" : "16px 20px")};
  font-size: 14px;
  color: ${COLORS.gray[900]};
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;

  @media screen and (max-width: 768px) {
    padding: ${(p) => (p.$hideLabels ? "0" : "0 16px")};
    font-size: 15px;
  }
`

const MapLinkIcon = styled.span`
  flex-shrink: 0;
  color: ${COLORS.blue[500]};
  display: flex;
  align-items: center;
  margin-top: 1px;
`

const StatusBadge = styled.span<{ status: string | null }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;

  @media screen and (max-width: 768px) {
    padding: 6px 14px;
    font-size: 14px;
  }

  background: ${({ status }) => getShareholderStatusChipBackground(status)};
  color: ${({ status }) => getShareholderStatusChipColor(status)};
`

const HistoryEmptyText = styled.span`
  font-size: 13px;
  color: ${COLORS.gray[400]};
`

const HistorySkeleton = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
`

const SkeletonBar = styled.div`
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    ${COLORS.gray[100]} 25%,
    ${COLORS.gray[200]} 50%,
    ${COLORS.gray[100]} 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`

const HistoryButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.blue[600]};
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${COLORS.blue[50]};
  }

  @media screen and (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: 12px;
    font-size: 15px;
    background: ${COLORS.blue[50]};
    font-weight: 500;

    &:hover {
      background: ${COLORS.blue[100]};
    }
  }
`

const _ModalWrapper = styled.div`
  @media screen and (max-width: 768px) {
    width: 100%;
    margin: 0;
  }
`

const HistoryModal = ({
  open,
  onClose,
  history,
}: {
  open: boolean
  onClose: () => void
  history: HistoryItem[]
}) => {
  return (
    <ModalComponent open={open} setOpen={onClose} position="center">
      <HistoryModalContent>
        <HistoryModalHeader>
          <ModalTitle>변경 이력</ModalTitle>
          <CloseButton onClick={onClose}>
            <Close fontSize="small" />
          </CloseButton>
        </HistoryModalHeader>
        <HistoryList>
          {history.map((item) => (
            <HistoryCardItem key={nanoid()} history={item} />
          ))}
        </HistoryList>
      </HistoryModalContent>
    </ModalComponent>
  )
}

const HistoryModalContent = styled.div`
  background: white;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;

  @media screen and (max-width: 768px) {
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 16px 16px 0 0;
    margin-top: auto;
  }
`

const HistoryModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${COLORS.gray[100]};

  @media screen and (max-width: 768px) {
    padding: 16px 20px;
  }
`

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${COLORS.gray[900]};
  margin: 0;
`

const HistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  @media screen and (max-width: 768px) {
    padding: 16px;
  }

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
        {history.changes?.phone && (
          <ChangeItem>
            <FieldName>휴대폰</FieldName>
            <ChangeContent>
              <ChangeText>
                {history.changes.phone.original || "(없음)"}
              </ChangeText>
              <ArrowIcon>→</ArrowIcon>
              <ChangeText highlight>
                {history.changes.phone.modified || "(없음)"}
              </ChangeText>
            </ChangeContent>
          </ChangeItem>
        )}
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
      </HistoryDetails>
    </HistoryCard>
  )
}

const _PreviewContainer = styled.div`
  padding: 8px 12px;
  background: ${COLORS.gray[50]};
  border-radius: 8px;

  @media screen and (max-width: 768px) {
    padding: 12px 16px;
    margin: 0 -4px;
  }
`

const _PreviewHeader = styled.div`
  display: flex;
  gap: 4px;
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
