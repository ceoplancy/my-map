import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useShareholderStats } from "@/api/workspace"
import { useFilterStore } from "@/store/filterState"

export type StatsCardProps = {
  /** 지도 페이지: 현재 워크스페이스 노출 명부 기준 집계 (shareholders) */
  listIds: string[]
}

const StatsCard = ({ listIds }: StatsCardProps) => {
  const { statusFilter, companyFilter, cityFilter, stocks } = useFilterStore()

  const hasLists = listIds.length > 0
  const { data: shareholderStats, isLoading: shareholderLoading } =
    useShareholderStats({
      listIds: hasLists ? listIds : null,
      status: statusFilter?.length ? statusFilter : undefined,
      company: companyFilter?.length ? companyFilter : undefined,
      city: cityFilter || undefined,
      stocks: stocks?.length ? stocks : undefined,
    })

  const stats = shareholderStats ?? {
    totalShareholders: 0,
    totalStocks: 0,
    completedShareholders: 0,
    completedStocks: 0,
  }
  const isLoading = hasLists ? shareholderLoading : false

  return (
    <Container>
      <HeaderSection>
        <Title>의결권 현황</Title>
        <InfoText>- 지도 위치가 아닌 필터 설정에 따른 정보입니다.</InfoText>
      </HeaderSection>
      <StatItem>
        <StatLabel>총 주주 수</StatLabel>
        <StatValue>
          {isLoading
            ? "-"
            : `${(stats?.totalShareholders ?? 0).toLocaleString()}명`}
        </StatValue>
      </StatItem>
      <StatItem>
        <StatLabel>총 주식 수</StatLabel>
        <StatValue>
          {isLoading ? "-" : `${(stats?.totalStocks ?? 0).toLocaleString()}주`}
        </StatValue>
      </StatItem>
      <StatItem>
        <StatLabel>완료 주주 수</StatLabel>
        <StatValue>
          {isLoading
            ? "-"
            : `${(stats?.completedShareholders ?? 0).toLocaleString()}명`}
        </StatValue>
      </StatItem>
      <StatItem>
        <StatLabel>완료 주식 수</StatLabel>
        <StatValue>
          {isLoading
            ? "-"
            : `${(stats?.completedStocks ?? 0).toLocaleString()}주`}
        </StatValue>
      </StatItem>
    </Container>
  )
}

export default StatsCard

const Container = styled.div`
  background: ${COLORS.blue[50]};
  border-radius: 12px;
  padding: 20px;
  margin: 12px 0;

  @media (max-width: 768px) {
    padding: 16px;
    margin: 8px 0;
  }
`

const HeaderSection = styled.div`
  margin-bottom: 16px;
`

const Title = styled.h3`
  font-size: 0.875rem;
  color: ${COLORS.blue[700]};
  font-weight: 600;
  margin-bottom: 4px;
`

const InfoText = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: ${COLORS.gray[500]};
  border-radius: 4px;
  width: fit-content;
`

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`

const StatLabel = styled.span`
  color: ${COLORS.gray[600]};
  font-size: 0.875rem;
`

const StatValue = styled.span`
  color: ${COLORS.gray[900]};
  font-weight: 600;
  font-size: 0.875rem;
`
