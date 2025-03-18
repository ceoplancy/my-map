import { useEffect, useMemo } from "react"
import { useGetFilterMenu } from "@/api/supabase"
import { useFilterStore } from "@/store/filterState"

import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { Clear as ClearIcon } from "@mui/icons-material"
import { Alert } from "@mui/material"
import { useGetUserData } from "@/api/auth"

interface FilterModalChildrenProps {
  handleClose: () => void
  handleApplyFilters: () => void
}

const MAJOR_CITIES = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "충청",
  "대구",
  "전라",
  "경상",
  "제주",
]

const STOCK_RANGES = [
  { label: "1천주 미만", start: 0, end: 999 },
  { label: "1천주 ~ 5천주", start: 1000, end: 4999 },
  { label: "5천주 ~ 1만주", start: 5000, end: 9999 },
  { label: "1만주 ~ 2만주", start: 10000, end: 19999 },
  { label: "2만주 ~ 3만주", start: 20000, end: 29999 },
  { label: "3만주 ~ 4만주", start: 30000, end: 39999 },
  { label: "4만주 ~ 5만주", start: 40000, end: 49999 },
  { label: "5만주 ~ 10만주", start: 50000, end: 99999 },
  { label: "10만주 이상", start: 100000, end: 99999999999 },
] as const

const FilterModalChildren = ({
  handleClose,
  handleApplyFilters,
}: FilterModalChildrenProps) => {
  const {
    statusFilter,
    companyFilter,
    cityFilter,
    stocks,
    setStatusFilter,
    setCompanyFilter,
    setCityFilter,
    setStocks,
    resetFilters,
  } = useFilterStore()
  const { data: user } = useGetUserData()
  const { data: filterMenu } = useGetFilterMenu()
  const isAdmin = String(user?.user?.user_metadata?.role).includes("admin")

  // 사용자의 허용된 필터 옵션들
  const allowedStatus = useMemo(
    () => user?.user?.user_metadata?.allowedStatus || [],
    [user?.user?.user_metadata?.allowedStatus],
  )

  const allowedCompany = useMemo(
    () => user?.user?.user_metadata?.allowedCompany || [],
    [user?.user?.user_metadata?.allowedCompany],
  )

  // 관리자는 모든 필터를, 일반 사용자는 허용된 필터만 표시
  const availableStatus = isAdmin
    ? filterMenu?.statusMenu || []
    : filterMenu?.statusMenu?.filter((status) =>
        allowedStatus.includes(status),
      ) || []

  const availableCompany = isAdmin
    ? filterMenu?.companyMenu || []
    : filterMenu?.companyMenu?.filter((company) =>
        allowedCompany.includes(company),
      ) || []

  // 선택된 필터가 허용 범위를 벗어나면 자동으로 제거
  useEffect(() => {
    if (!isAdmin) {
      setStatusFilter((prev) =>
        prev.filter((status) => allowedStatus.includes(status)),
      )
      setCompanyFilter((prev) =>
        prev.filter((company) => allowedCompany.includes(company)),
      )
    }
  }, [
    isAdmin,
    allowedStatus,
    allowedCompany,
    setStatusFilter,
    setCompanyFilter,
  ])

  const handleRangeSelect = (start: number, end: number) => {
    setStocks((prev) => {
      const isSelected = prev.some(
        (range) => range.start === start && range.end === end,
      )

      if (isSelected) {
        return prev.filter(
          (range) => !(range.start === start && range.end === end),
        )
      } else {
        return [...prev, { start, end }]
      }
    })
  }

  const handleCompanyFilter = (selectedCompany: string) => {
    setCompanyFilter((prev) => {
      // 이미 선택된 회사인 경우 제거
      if (prev.includes(selectedCompany)) {
        return prev.filter((company) => company !== selectedCompany)
      }

      // 새로운 회사 추가
      return [...prev, selectedCompany]
    })
  }

  return (
    <FilterContainer>
      <ModalHeader>
        <ModalTitle>필터 설정</ModalTitle>
        <CloseButton onClick={handleClose}>
          <ClearIcon />
        </CloseButton>
      </ModalHeader>

      <FilterSection>
        <SectionTitle>지역(문자가 포함된 주소)</SectionTitle>
        <Alert severity="info" sx={{ mb: 2 }}>
          현재 지도에서 보고 있는 지역을 기준으로 필터링됩니다(서울을 보고
          있는데 부산으로 필터링되면 '부산'이 포함된 서울 지역만 필터링됩니다).
        </Alert>
        <ChipsWrapper>
          <FilterChip
            key={"전체"}
            isSelected={cityFilter === ""}
            onClick={() => {
              setCityFilter("")
            }}>
            전체
          </FilterChip>
          {MAJOR_CITIES.map((city) => {
            const isSelected = cityFilter?.includes(city)

            return (
              <FilterChip
                key={city}
                isSelected={isSelected}
                onClick={() => {
                  setCityFilter(city)
                }}>
                {city}
              </FilterChip>
            )
          })}
        </ChipsWrapper>
      </FilterSection>

      <FilterSection>
        <SectionTitle>상태</SectionTitle>
        <ChipsWrapper>
          {availableStatus.map((status) => (
            <FilterChip
              key={status}
              isSelected={statusFilter.includes(status)}
              onClick={() => {
                if (statusFilter.includes(status)) {
                  setStatusFilter(statusFilter.filter((s) => s !== status))
                } else {
                  setStatusFilter([...statusFilter, status])
                }
              }}>
              {status}
            </FilterChip>
          ))}
        </ChipsWrapper>
      </FilterSection>

      <FilterSection>
        <SectionTitle>회사명(구분1)</SectionTitle>
        <ChipsWrapper>
          {availableCompany.map((company) => (
            <FilterChip
              key={company}
              isSelected={companyFilter.includes(company)}
              onClick={() => handleCompanyFilter(company)}>
              {company}
            </FilterChip>
          ))}
        </ChipsWrapper>
      </FilterSection>

      <FilterSection>
        <SectionTitle>주식수 (다중 선택 가능)</SectionTitle>
        <StockRangeWrapper>
          {STOCK_RANGES.map((range) => (
            <StockRangeButton
              key={range.label}
              isSelected={stocks.some(
                (s) => s.start === range.start && s.end === range.end,
              )}
              onClick={() => handleRangeSelect(range.start, range.end)}>
              {range.label}
            </StockRangeButton>
          ))}
        </StockRangeWrapper>
      </FilterSection>

      <ButtonGroup>
        <ResetButton onClick={resetFilters}>필터 초기화</ResetButton>
        <ApplyButton onClick={handleApplyFilters}>적용하기</ApplyButton>
      </ButtonGroup>
    </FilterContainer>
  )
}

const FilterContainer = styled.div`
  padding: 24px;
  position: relative;
  height: 100%;
  overflow-y: auto;
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${COLORS.gray[900]};
`

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.gray[500]};
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
  }

  svg {
    font-size: 20px;
  }
`

const FilterSection = styled.div`
  margin-bottom: 32px;
`

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${COLORS.gray[900]};
  margin-bottom: 4px;
`

const ChipsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const FilterChip = styled.button<{ isSelected: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid
    ${(props) => (props.isSelected ? COLORS.blue[500] : COLORS.gray[200])};
  background: ${(props) => (props.isSelected ? COLORS.blue[50] : "white")};
  color: ${(props) => (props.isSelected ? COLORS.blue[700] : COLORS.gray[700])};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.isSelected ? COLORS.blue[100] : COLORS.gray[50]};
  }
`

const StockRangeWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const StockRangeButton = styled.button<{ isSelected: boolean }>`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid
    ${(props) => (props.isSelected ? COLORS.blue[500] : COLORS.gray[200])};
  background: ${(props) => (props.isSelected ? COLORS.blue[50] : "white")};
  color: ${(props) => (props.isSelected ? COLORS.blue[700] : COLORS.gray[700])};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.isSelected ? COLORS.blue[100] : COLORS.gray[50]};
  }
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
`

const ResetButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.gray[500]};
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
  }
`

const ApplyButton = styled.button`
  background: ${COLORS.blue[500]};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.blue[600]};
  }
`

export default FilterModalChildren
