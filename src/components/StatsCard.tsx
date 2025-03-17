import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useFilteredStats } from "@/hooks/useFilteredStats"
import { useGetUserData } from "@/api/auth"
import { useFilterStore } from "@/store/filterState"

const StatsCard = () => {
  const { data: user } = useGetUserData()
  const { statusFilter, companyFilter, cityFilter, stocks } = useFilterStore()

  const { data: stats, isLoading } = useFilteredStats({
    status: statusFilter,
    company: companyFilter,
    city: cityFilter,
    stocks: stocks,
    userMetadata: user?.user.user_metadata,
  })

  return (
    <Container>
      <HeaderSection>
        <Title>의결권 현황</Title>
        <InfoText>- 지도 위치가 아닌 필터 설정에 따른 정보입니다.</InfoText>
      </HeaderSection>
      <StatItem>
        <StatLabel>총 주주 수</StatLabel>
        <StatValue>
          {isLoading ? "-" : `${stats?.totalShareholders.toLocaleString()}명`}
        </StatValue>
      </StatItem>
      <StatItem>
        <StatLabel>총 주식 수</StatLabel>
        <StatValue>
          {isLoading ? "-" : `${stats?.totalStocks.toLocaleString()}주`}
        </StatValue>
      </StatItem>
      <StatItem>
        <StatLabel>완료 주주 수</StatLabel>
        <StatValue>
          {isLoading
            ? "-"
            : `${stats?.completedShareholders.toLocaleString()}명`}
        </StatValue>
      </StatItem>
      <StatItem>
        <StatLabel>완료 주식 수</StatLabel>
        <StatValue>
          {isLoading ? "-" : `${stats?.completedStocks.toLocaleString()}주`}
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
