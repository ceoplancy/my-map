import { useEffect, useMemo, useState, useCallback } from "react"
import { useGetFilterMenu } from "@/api/supabase"
import { searchShareholdersForMap } from "@/api/shareholderSearch"
import { useFilterStore } from "@/store/filterState"

import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { Clear as ClearIcon } from "@mui/icons-material"
import { Alert } from "@mui/material"
import { useGetUserData } from "@/api/auth"
import { STORAGE_KEY } from "@/pages"
import type { Excel } from "@/types/excel"

interface FilterModalChildrenProps {
  handleClose: () => void
  handleApplyFilters: () => void
  onNavigateToShareholder?: (_row: Excel) => void
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
  { label: "10만주 이상", start: 100000, end: 199999 },
  { label: "20만주 이상", start: 200000, end: 399999 },
  { label: "40만주 이상", start: 400000, end: 599999 },
  { label: "60만주 이상", start: 600000, end: 799999 },
  { label: "80만주 이상", start: 800000, end: 999999 },
  { label: "100만주 이상", start: 1000000, end: 1499999 },
  { label: "150만주 이상", start: 1500000, end: 99999999999 },
] as const

const FilterModalChildren = ({
  handleClose,
  handleApplyFilters,
  onNavigateToShareholder,
}: FilterModalChildrenProps) => {
  const {
    statusFilter,
    companyFilter,
    cityFilter,
    stocks,
    rosterStockMin,
    rosterStockMax,
    setStatusFilter,
    setCompanyFilter,
    setCityFilter,
    setStocks,
    setRosterStockMin,
    setRosterStockMax,
    resetFilters,
  } = useFilterStore()
  const { data: user } = useGetUserData()
  const { data: filterMenu } = useGetFilterMenu()
  const isAdmin = String(user?.user?.user_metadata?.role).includes("admin")

  const [shareSearch, setShareSearch] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchHits, setSearchHits] = useState<Excel[]>([])

  const runShareSearch = useCallback(async () => {
    const q = shareSearch.trim()
    if (q.length < 2) {
      setSearchHits([])

      return
    }
    setSearchLoading(true)
    try {
      const rows = await searchShareholdersForMap(q, user?.user?.user_metadata)
      setSearchHits(rows)
    } finally {
      setSearchLoading(false)
    }
  }, [shareSearch, user?.user?.user_metadata])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runShareSearch()
    }, 450)

    return () => window.clearTimeout(t)
  }, [runShareSearch])

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

      {onNavigateToShareholder && (
        <FilterSection>
          <SectionTitle>주주 빠른 이동</SectionTitle>
          <Alert severity="info" sx={{ mb: 1 }}>
            이름·주소·휴대폰으로 검색(2자 이상). 항목을 누르면 지도가 해당
            위치로 이동하고 정보 창이 열립니다.
          </Alert>
          <SearchInput
            type="search"
            placeholder="예: 홍길동, 테헤란로, 010"
            value={shareSearch}
            onChange={(e) => setShareSearch(e.target.value)}
          />
          {searchLoading && <SearchHint>검색 중…</SearchHint>}
          {searchHits.length > 0 && (
            <SearchHitList>
              {searchHits.map((row) => (
                <SearchHitButton
                  key={row.id}
                  type="button"
                  onClick={() => {
                    onNavigateToShareholder(row)
                  }}>
                  <SearchHitName>{row.name || "(이름 없음)"}</SearchHitName>
                  <SearchHitMeta>
                    {row.company ? `${row.company} · ` : ""}
                    {row.address ?? ""}
                  </SearchHitMeta>
                </SearchHitButton>
              ))}
            </SearchHitList>
          )}
        </FilterSection>
      )}

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

      {companyFilter.length === 1 && (
        <FilterSection>
          <SectionTitle>선택한 주주명부만 주식수 (숫자)</SectionTitle>
          <Alert severity="warning" sx={{ mb: 1 }}>
            회사(구분1)을 <strong>하나만</strong> 선택했을 때만 적용됩니다. 값을
            넣으면 아래 &quot;주식수 구간&quot; 칩 필터는 사용하지 않습니다.
          </Alert>
          <RosterStockRow>
            <NumberField
              type="number"
              inputMode="numeric"
              placeholder="최소 주식수"
              value={rosterStockMin}
              onChange={(e) => setRosterStockMin(e.target.value)}
            />
            <RosterSep>~</RosterSep>
            <NumberField
              type="number"
              inputMode="numeric"
              placeholder="최대 주식수"
              value={rosterStockMax}
              onChange={(e) => setRosterStockMax(e.target.value)}
            />
          </RosterStockRow>
        </FilterSection>
      )}

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
        <ResetButton
          onClick={() => {
            localStorage.setItem(STORAGE_KEY.level, "6")
            localStorage.setItem(
              STORAGE_KEY.position,
              JSON.stringify({ lat: 37.5665, lng: 126.978 }),
            )
            resetFilters()
          }}>
          필터 초기화
        </ResetButton>
        <ApplyButton onClick={handleApplyFilters}>적용하기</ApplyButton>
      </ButtonGroup>
    </FilterContainer>
  )
}

const FilterContainer = styled.div`
  padding: 24px;
  padding-bottom: max(24px, env(safe-area-inset-bottom, 0px));
  position: relative;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;

  @media (max-width: 640px) {
    padding: 16px;
    padding-bottom: max(20px, env(safe-area-inset-bottom, 0px));
  }
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
  padding: 10px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
  }

  svg {
    font-size: 22px;
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
  padding: 10px 16px;
  min-height: 44px;
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

  @media (max-width: 480px) {
    font-size: 15px;
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
  min-height: 44px;
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
  gap: 12px;
  margin-top: 24px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
    align-items: stretch;
  }
`

const ResetButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.gray[500]};
  cursor: pointer;
  padding: 12px 18px;
  min-height: 48px;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`

const ApplyButton = styled.button`
  background: ${COLORS.blue[500]};
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 22px;
  min-height: 48px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.blue[600]};
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${COLORS.gray[200]};
  font-size: 14px;
  margin-bottom: 8px;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const SearchHint = styled.p`
  font-size: 12px;
  color: ${COLORS.gray[500]};
  margin: 0 0 8px;
`

const SearchHitList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
`

const SearchHitButton = styled.button`
  text-align: left;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${COLORS.gray[200]};
  background: ${COLORS.gray[50]};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${COLORS.blue[50]};
    border-color: ${COLORS.blue[200]};
  }
`

const SearchHitName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: ${COLORS.gray[900]};
`

const SearchHitMeta = styled.div`
  font-size: 12px;
  color: ${COLORS.gray[600]};
  margin-top: 4px;
  word-break: break-all;
`

const RosterStockRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const NumberField = styled.input`
  flex: 1;
  min-width: 120px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${COLORS.gray[200]};
  font-size: 14px;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const RosterSep = styled.span`
  color: ${COLORS.gray[500]};
  font-weight: 600;
`

export default FilterModalChildren
