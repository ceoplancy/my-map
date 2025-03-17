import { Dispatch, SetStateAction, useEffect, useMemo } from "react"
import { useGetFilterMenu } from "@/api/supabase"

import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { Clear as ClearIcon } from "@mui/icons-material"
import { Alert } from "@mui/material"
import { useGetUserData } from "@/api/auth"

interface FilterModalChildrenProps {
  statusFilter: string[]
  setStatusFilter: Dispatch<SetStateAction<string[]>>
  companyFilter: string[]
  setCompanyFilter: Dispatch<SetStateAction<string[]>>
  cityFilter: string
  setCityFilter: Dispatch<SetStateAction<string>>
  setStocks: Dispatch<SetStateAction<{ start: number; end: number }>>
  excelDataRefetch: () => void
  setIsFilterModalOpen: Dispatch<SetStateAction<boolean>>
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

const FilterModalChildren = ({
  statusFilter,
  setStatusFilter,
  companyFilter,
  setCompanyFilter,
  cityFilter,
  setCityFilter,
  setStocks,
  excelDataRefetch,
  setIsFilterModalOpen,
}: FilterModalChildrenProps) => {
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

  return (
    <FilterContainer>
      <ModalHeader>
        <ModalTitle>필터 설정</ModalTitle>
        <CloseButton onClick={() => setIsFilterModalOpen(false)}>
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
              onClick={() => {
                if (companyFilter.includes(company)) {
                  setCompanyFilter(companyFilter.filter((c) => c !== company))
                } else {
                  setCompanyFilter([...companyFilter, company])
                }
              }}>
              {company}
            </FilterChip>
          ))}
        </ChipsWrapper>
      </FilterSection>

      <FilterSection>
        <SectionTitle>주식수</SectionTitle>
        <StockInputWrapper>
          <StockInput
            type="number"
            placeholder="최소 주식수"
            onChange={(e) => {
              setStocks((prev) => ({
                ...prev,
                start: Number(e.target.value),
              }))
            }}
          />
          <StockDivider>~</StockDivider>
          <StockInput
            type="number"
            placeholder="최대 주식수"
            onChange={(e) => {
              setStocks((prev) => ({
                ...prev,
                end: Number(e.target.value),
              }))
            }}
          />
        </StockInputWrapper>
      </FilterSection>

      <ActionButton
        onClick={() => {
          excelDataRefetch()
          setIsFilterModalOpen(false)
        }}>
        필터 적용하기
      </ActionButton>
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

const StockInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    gap: 8px;
  }
`

const StockInput = styled.input`
  flex: 1;
  min-width: 120px;
  max-width: calc(50% - 20px);
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid ${COLORS.gray[200]};
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;

  @media (max-width: 480px) {
    max-width: 100%;
    padding: 10px 12px;
  }

  &:focus {
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 2px ${COLORS.blue[100]};
  }

  &::placeholder {
    color: ${COLORS.gray[400]};
  }
`

const StockDivider = styled.span`
  color: ${COLORS.gray[400]};

  @media (max-width: 480px) {
    width: 100%;
    text-align: center;
  }
`

const ActionButton = styled.button`
  width: 100%;
  padding: 14px;
  background: ${COLORS.blue[500]};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.blue[600]};
  }
`

export default FilterModalChildren
