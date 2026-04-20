import { useMemo } from "react"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { type ShareholdersParams, useShareholderStats } from "@/api/workspace"
import { getFilterSummaryChips } from "@/lib/filterSummaryChips"
import { useFilterStore } from "@/store/filterState"
import { PRIMARY_STATUS_OPTIONS } from "@/lib/shareholderStatus"

export type StatsCardProps = {
  /** 지도와 동일 파라미터(뷰포트·검색·필터)로 집계 */
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
  const {
    statusPrimaryFilter,
    companyFilter,
    cityFilter,
    stocks,
    companyStockFilterMap,
    companyFilterProfiles,
  } = useFilterStore()

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
  }
  const byPrimary = stats.byPrimary ?? emptyByPrimary()
  const isLoading = hasLists ? shareholderLoading : false

  const totalH = stats.totalShareholders ?? 0
  const totalS = stats.totalStocks ?? 0
  const doneH = stats.completedShareholders ?? 0
  const doneS = stats.completedStocks ?? 0

  const completionPct =
    !isLoading && totalH > 0
      ? Math.min(100, Math.round((doneH / totalH) * 1000) / 10)
      : null

  const filterChips = useMemo(
    () =>
      getFilterSummaryChips({
        cityFilter,
        statusPrimaryFilter,
        companyFilter,
        companyFilterProfiles,
        stocks,
        companyStockFilterMap,
      }),
    [
      cityFilter,
      statusPrimaryFilter,
      companyFilter,
      companyFilterProfiles,
      stocks,
      companyStockFilterMap,
    ],
  )

  return (
    <Container>
      <HeaderSection>
        <Title>의결권 현황</Title>
        <InfoText>
          필터를 아무 것도 고르지 않으면 1차 상태·회사·지역 등 제한 없이
          집계합니다. 지도와 동일하게 현재 지도 중심·줌(또는 주주 검색 시 검색
          조건)이 반영됩니다. 필터를 바꾼 뒤 적용하면 함께 갱신됩니다.
        </InfoText>
      </HeaderSection>

      {filterChips.length > 0 ? (
        <FilterChipRow aria-label="적용 중인 필터">
          {filterChips.map((text, i) => (
            <FilterChip key={`${text}-${i}`}>{text}</FilterChip>
          ))}
        </FilterChipRow>
      ) : (
        <FilterHint>
          적용 중인 필터 없음 · 조건 미선택 = 전체(명부·지도 화면과 동일 범위)
        </FilterHint>
      )}

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
        <PrimaryTitle>1차 상태</PrimaryTitle>
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

const FilterChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`

const FilterChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  background: ${COLORS.gray[50]};
  border: 1px solid ${COLORS.gray[200]};
  max-width: 100%;
`

const FilterHint = styled.p`
  margin: 0 0 12px;
  font-size: 0.6875rem;
  color: ${COLORS.gray[500]};
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
