import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { type ShareholdersParams, useShareholderStats } from "@/api/workspace"
import {
  PRIMARY_STATUS_OPTIONS,
  type PrimaryStatus,
} from "@/lib/shareholderStatus"

const PRIMARY_HEADER_SHORT: Record<PrimaryStatus, string> = {
  미방문: "미방문",
  완료: "완료",
  보류: "보류",
  실패: "실패",
  전자투표: "전자",
  주주총회: "주총",
}

export type StatsCardProps = {
  /** 주주 집계용 파라미터. 대시보드는 보통 `listIds`만 넘겨 명부 전체 현황을 봅니다 */
  statsParams: ShareholdersParams
}

const emptyByPrimary = () => {
  const o: Record<
    (typeof PRIMARY_STATUS_OPTIONS)[number],
    { count: number; stocks: number }
  > = {} as Record<
    (typeof PRIMARY_STATUS_OPTIONS)[number],
    { count: number; stocks: number }
  >
  for (const p of PRIMARY_STATUS_OPTIONS) {
    o[p] = { count: 0, stocks: 0 }
  }

  return o
}

const StatsCard = ({ statsParams }: StatsCardProps) => {
  const hasLists = !!(
    statsParams.listId || (statsParams.listIds?.length ?? 0) > 0
  )
  const { data: shareholderStats, isLoading: shareholderLoading } =
    useShareholderStats(statsParams)

  const stats = shareholderStats ?? {
    totalShareholders: 0,
    totalStocks: 0,
    completedShareholders: 0,
    completedStocks: 0,
    byPrimary: emptyByPrimary(),
    byCompanyPrimary: [],
  }
  const byPrimary = stats.byPrimary ?? emptyByPrimary()
  const byCompanyPrimary = stats.byCompanyPrimary ?? []
  const isLoading = hasLists ? shareholderLoading : false

  const totalH = stats.totalShareholders ?? 0
  const totalS = stats.totalStocks ?? 0
  const doneH = stats.completedShareholders ?? 0
  const doneS = stats.completedStocks ?? 0

  const completionPct =
    !isLoading && totalH > 0
      ? Math.min(100, Math.round((doneH / totalH) * 1000) / 10)
      : null

  return (
    <Container>
      <HeaderSection>
        <Title>의결권 현황</Title>
        <InfoText>
          노출된 주주명부 전체를 기준으로 합니다. 지도 위치·줌·필터·검색과
          무관하게 같은 숫자가 유지됩니다. 회사별 표는 1차 상태(미방문·완료 등)
          인원·주식수입니다.
        </InfoText>
      </HeaderSection>

      <KpiRow>
        <KpiCard $variant="neutral">
          <KpiLabel>총 주주</KpiLabel>
          <KpiValue>
            {isLoading ? "—" : `${totalH.toLocaleString()}명`}
          </KpiValue>
          <KpiSub>{isLoading ? "—" : `${totalS.toLocaleString()}주`}</KpiSub>
        </KpiCard>
        <KpiCard $variant="success">
          <KpiLabel>완료</KpiLabel>
          <KpiValue>{isLoading ? "—" : `${doneH.toLocaleString()}명`}</KpiValue>
          <KpiSub>{isLoading ? "—" : `${doneS.toLocaleString()}주`}</KpiSub>
        </KpiCard>
      </KpiRow>

      {completionPct != null && (
        <ProgressBlock>
          <ProgressTop>
            <span>완료율</span>
            <ProgressPct>{completionPct}%</ProgressPct>
          </ProgressTop>
          <ProgressTrack
            role="progressbar"
            aria-valuenow={completionPct}
            aria-valuemin={0}
            aria-valuemax={100}>
            <ProgressFill $pct={completionPct} />
          </ProgressTrack>
        </ProgressBlock>
      )}

      <PrimarySection>
        <PrimaryTitle>전체 1차 상태</PrimaryTitle>
        <PrimaryScroll>
          {PRIMARY_STATUS_OPTIONS.map((p) => (
            <PrimaryCell key={p}>
              <PrimaryName>{p}</PrimaryName>
              <PrimaryCount>
                {isLoading
                  ? "—"
                  : `${(byPrimary[p]?.count ?? 0).toLocaleString()}명`}
              </PrimaryCount>
              <PrimaryStocks>
                {isLoading
                  ? "—"
                  : `${(byPrimary[p]?.stocks ?? 0).toLocaleString()}주`}
              </PrimaryStocks>
            </PrimaryCell>
          ))}
        </PrimaryScroll>
      </PrimarySection>

      <CompanySection>
        <CompanyTitle>회사별 1차 상태</CompanyTitle>
        {!hasLists ? (
          <CompanyEmpty>노출된 명부가 없습니다.</CompanyEmpty>
        ) : isLoading ? (
          <CompanyEmpty>불러오는 중…</CompanyEmpty>
        ) : byCompanyPrimary.length === 0 ? (
          <CompanyEmpty>집계할 주주가 없습니다.</CompanyEmpty>
        ) : (
          <CompanyTableWrap>
            <CompanyTable>
              <thead>
                <tr>
                  <Th scope="col">회사</Th>
                  {PRIMARY_STATUS_OPTIONS.map((p) => (
                    <Th key={p} scope="col" title={p}>
                      {PRIMARY_HEADER_SHORT[p]}
                    </Th>
                  ))}
                  <Th scope="col">합(명)</Th>
                  <Th scope="col">합(주)</Th>
                </tr>
              </thead>
              <tbody>
                {byCompanyPrimary.map((row) => (
                  <tr key={row.company}>
                    <Td $strong>{row.company}</Td>
                    {PRIMARY_STATUS_OPTIONS.map((p) => (
                      <Td key={p}>
                        {(row.byPrimary[p]?.count ?? 0).toLocaleString()}
                        <CellStocks>
                          {(row.byPrimary[p]?.stocks ?? 0).toLocaleString()}주
                        </CellStocks>
                      </Td>
                    ))}
                    <Td $strong>{row.totalShareholders.toLocaleString()}</Td>
                    <Td $strong>{row.totalStocks.toLocaleString()}</Td>
                  </tr>
                ))}
              </tbody>
            </CompanyTable>
          </CompanyTableWrap>
        )}
      </CompanySection>
    </Container>
  )
}

export default StatsCard

const Container = styled.div`
  background: #fff;
  border: 1px solid ${COLORS.gray[100]};
  border-radius: 12px;
  padding: 16px;
  margin: 0 0 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);

  @media (max-width: 768px) {
    padding: 14px;
    margin: 0 0 10px;
  }
`

const HeaderSection = styled.div`
  margin-bottom: 12px;
`

const Title = styled.h3`
  font-size: 0.9375rem;
  color: ${COLORS.gray[900]};
  font-weight: 700;
  margin: 0 0 6px;
`

const InfoText = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: ${COLORS.gray[600]};
  line-height: 1.45;
`

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
`

const KpiCard = styled.div<{ $variant: "neutral" | "success" }>`
  background: #fff;
  border-radius: 10px;
  padding: 12px 10px;
  border: 1px solid
    ${(p) => (p.$variant === "success" ? COLORS.green[200] : COLORS.gray[200])};
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
`

const KpiLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${COLORS.gray[500]};
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 4px;
`

const KpiValue = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: ${COLORS.gray[900]};
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
`

const KpiSub = styled.div`
  margin-top: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${COLORS.gray[600]};
  font-variant-numeric: tabular-nums;
`

const ProgressBlock = styled.div`
  margin-bottom: 14px;
`

const ProgressTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: ${COLORS.gray[600]};
  margin-bottom: 6px;
`

const ProgressPct = styled.span`
  font-weight: 700;
  color: ${COLORS.green[700]};
  font-variant-numeric: tabular-nums;
`

const ProgressTrack = styled.div`
  height: 8px;
  border-radius: 999px;
  background: ${COLORS.gray[200]};
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    ${COLORS.green[400]},
    ${COLORS.green[600]}
  );
  transition: width 0.35s ease;
`

const PrimarySection = styled.div`
  padding-top: 12px;
  border-top: 1px solid ${COLORS.gray[100]};
`

const PrimaryTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${COLORS.gray[800]};
  margin-bottom: 8px;
`

const PrimaryScroll = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin: 0 -4px;
  padding-left: 4px;
  padding-right: 4px;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${COLORS.gray[300]};
    border-radius: 4px;
  }
`

const PrimaryCell = styled.div`
  flex: 0 0 auto;
  min-width: 108px;
  scroll-snap-align: start;
  background: ${COLORS.gray[50]};
  border-radius: 10px;
  padding: 8px 10px;
  border: 1px solid ${COLORS.gray[200]};
`

const PrimaryName = styled.div`
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${COLORS.gray[700]};
  margin-bottom: 4px;
`

const PrimaryCount = styled.div`
  font-size: 0.8125rem;
  font-weight: 800;
  color: ${COLORS.gray[900]};
  font-variant-numeric: tabular-nums;
`

const PrimaryStocks = styled.div`
  margin-top: 2px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${COLORS.gray[500]};
  font-variant-numeric: tabular-nums;
`

const CompanySection = styled.div`
  padding-top: 14px;
  margin-top: 4px;
  border-top: 1px solid ${COLORS.gray[100]};
`

const CompanyTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${COLORS.gray[800]};
  margin-bottom: 8px;
`

const CompanyEmpty = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${COLORS.gray[500]};
  line-height: 1.45;
`

const CompanyTableWrap = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 -4px;
  padding: 0 4px 4px;
  border-radius: 10px;
`

const CompanyTable = styled.table`
  width: max(100%, 640px);
  border-collapse: collapse;
  font-size: 0.6875rem;
  background: ${COLORS.gray[50]};
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 10px;
  overflow: hidden;

  th,
  td {
    padding: 6px 5px;
    text-align: right;
    border-bottom: 1px solid ${COLORS.gray[200]};
    vertical-align: top;
  }

  th:first-of-type,
  td:first-of-type {
    text-align: left;
    position: sticky;
    left: 0;
    z-index: 1;
    background: ${COLORS.gray[50]};
    box-shadow: 2px 0 4px rgba(15, 23, 42, 0.04);
    min-width: 6.5rem;
    max-width: 8.5rem;
  }

  thead th:first-of-type {
    z-index: 2;
    background: ${COLORS.gray[100]};
  }

  thead th {
    background: ${COLORS.gray[100]};
    font-weight: 700;
    color: ${COLORS.gray[700]};
    white-space: nowrap;
    border-bottom: 1px solid ${COLORS.gray[300]};
  }

  tbody tr:last-of-type td {
    border-bottom: none;
  }
`

const Th = styled.th``

const Td = styled.td<{ $strong?: boolean }>`
  font-weight: ${(p) => (p.$strong ? 700 : 500)};
  color: ${(p) => (p.$strong ? COLORS.gray[900] : COLORS.gray[700])};
  font-variant-numeric: tabular-nums;
`

const CellStocks = styled.div`
  font-size: 0.6rem;
  font-weight: 500;
  color: ${COLORS.gray[500]};
  margin-top: 1px;
  line-height: 1.2;
`
