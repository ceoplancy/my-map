import { useEffect, useMemo, useState } from "react"
import { useGetFilterMenu } from "@/api/supabase"
import {
  useCompanyStockStatsForLists,
  useFilterMenuForLists,
} from "@/api/workspace"
import { useFilterStore } from "@/store/filterState"

import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { Clear as ClearIcon } from "@mui/icons-material"
import { Alert } from "@mui/material"
import { useGetUserData } from "@/api/auth"
import { getMapStorageKeys } from "@/constants/map-storage"

interface FilterModalChildrenProps {
  handleClose: () => void
  handleApplyFilters: () => void

  /** 워크스페이스 지도: 해당 명부 기준 회사/상태 옵션 사용 */
  listIds?: string[] | null

  /** 지도 뷰 localStorage 키를 WS별로 분리 */
  workspaceId?: string
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

type StockRangeUi = { label: string; start: number; end: number }

const formatStocks = (n: number) => `${Math.round(n).toLocaleString()}주`

const rangeLabel = (start: number, end: number, isLast: boolean) => {
  if (isLast) return `${formatStocks(start)} 이상`

  return `${formatStocks(start)} ~ ${formatStocks(end)}`
}

const dynamicStepForMax = (max: number) => {
  if (max <= 60_000) return 5_000
  if (max <= 200_000) return 10_000
  if (max <= 700_000) return 50_000
  if (max <= 2_000_000) return 100_000

  return 500_000
}

const buildAdaptiveRanges = (min: number, max: number): StockRangeUi[] => {
  const safeMin = Math.max(0, Math.floor(min))
  const safeMax = Math.max(safeMin, Math.floor(max))
  const step = dynamicStepForMax(safeMax)
  const baseStart = Math.floor(safeMin / step) * step
  const ranges: StockRangeUi[] = []
  let start = baseStart
  let guard = 0
  while (start <= safeMax && guard < 20) {
    const end = start + step - 1
    const isLast = end >= safeMax
    ranges.push({
      label: rangeLabel(start, isLast ? safeMax : end, isLast),
      start,
      end: isLast ? Number.MAX_SAFE_INTEGER : end,
    })
    start += step
    guard += 1
  }
  if (ranges.length === 0) {
    ranges.push({
      label: `${formatStocks(0)} 이상`,
      start: 0,
      end: Number.MAX_SAFE_INTEGER,
    })
  }

  return ranges
}

const STOCK_TAB_ALL = "__all__"

const FilterModalChildren = ({
  handleClose,
  handleApplyFilters,
  listIds,
  workspaceId,
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
    companyStockFilterMap,
    setCompanyStockFilterMap,
    resetFilters,
  } = useFilterStore()
  const [activeStockTab, setActiveStockTab] = useState<string>(STOCK_TAB_ALL)
  const { data: user } = useGetUserData()
  const useListScopedMenu = listIds != null
  const { data: filterMenu } = useGetFilterMenu({
    enabled: !useListScopedMenu,
  })
  const { data: filterMenuForLists } = useFilterMenuForLists(
    useListScopedMenu ? listIds : null,
  )
  const { data: companyStockStats = {} } = useCompanyStockStatsForLists(
    useListScopedMenu ? (listIds ?? null) : null,
  )
  const isAdmin = String(user?.user?.user_metadata?.role).includes("admin")

  const statusMenu =
    (useListScopedMenu
      ? filterMenuForLists?.statusMenu
      : filterMenu?.statusMenu) ?? []
  const companyMenu =
    (useListScopedMenu
      ? filterMenuForLists?.companyMenu
      : filterMenu?.companyMenu) ?? []

  // 사용자의 허용된 필터 옵션들 (워크스페이스가 아닐 때)
  const allowedStatus = useMemo(
    () => user?.user?.user_metadata?.allowedStatus || [],
    [user?.user?.user_metadata?.allowedStatus],
  )

  const allowedCompany = useMemo(
    () => user?.user?.user_metadata?.allowedCompany || [],
    [user?.user?.user_metadata?.allowedCompany],
  )

  // 관리자 또는 워크스페이스 명부 기준이면 전체, 아니면 허용된 것만
  const availableStatus =
    isAdmin || useListScopedMenu
      ? statusMenu
      : statusMenu.filter((status) => allowedStatus.includes(status))

  const availableCompany =
    isAdmin || useListScopedMenu
      ? companyMenu
      : companyMenu.filter((company) => allowedCompany.includes(company))

  useEffect(() => {
    if (isAdmin || useListScopedMenu) return
    setStatusFilter((prev) =>
      prev.filter((status) => allowedStatus.includes(status)),
    )
    setCompanyFilter((prev) =>
      prev.filter((company) => allowedCompany.includes(company)),
    )
  }, [
    isAdmin,
    useListScopedMenu,
    allowedStatus,
    allowedCompany,
    setStatusFilter,
    setCompanyFilter,
  ])

  useEffect(() => {
    setCompanyStockFilterMap((prev) => {
      const allowed = new Set(availableCompany)
      const next: typeof prev = {}
      for (const [company, ranges] of Object.entries(prev)) {
        if (allowed.has(company)) next[company] = ranges
      }

      return next
    })
  }, [availableCompany, setCompanyStockFilterMap])

  const handleCompanyRangeSelect = (
    company: string,
    start: number,
    end: number,
  ) => {
    setCompanyStockFilterMap((prev) => {
      const current = prev[company] ?? []
      const exists = current.some((r) => r.start === start && r.end === end)
      const nextForCompany = exists
        ? current.filter((r) => !(r.start === start && r.end === end))
        : [...current, { start, end }]

      return {
        ...prev,
        [company]: nextForCompany,
      }
    })
  }

  const handleCompanyFilter = (selectedCompany: string) => {
    setCompanyFilter((prev) => {
      // 이미 선택된 회사인 경우 제거
      if (prev.includes(selectedCompany)) {
        setCompanyStockFilterMap((map) => {
          const next = { ...map }
          delete next[selectedCompany]

          return next
        })

        return prev.filter((company) => company !== selectedCompany)
      }

      // 새로운 회사 추가
      return [...prev, selectedCompany]
    })
  }

  const companySpecificRanges = useMemo(() => {
    const out: Record<string, StockRangeUi[]> = {}
    for (const company of companyFilter) {
      const stats = companyStockStats[company]
      if (!stats) continue
      out[company] = buildAdaptiveRanges(stats.min, stats.max)
    }

    return out
  }, [companyFilter, companyStockStats])

  const targetCompaniesForGlobalStocks = useMemo(() => {
    return companyFilter.length > 0 ? companyFilter : availableCompany
  }, [companyFilter, availableCompany])

  const globalStockRanges = useMemo(() => {
    const statsRows = targetCompaniesForGlobalStocks
      .map((company) => companyStockStats[company])
      .filter(Boolean)
    if (statsRows.length === 0) return []
    const min = Math.min(...statsRows.map((s) => s.min))
    const max = Math.max(...statsRows.map((s) => s.max))

    return buildAdaptiveRanges(min, max)
  }, [targetCompaniesForGlobalStocks, companyStockStats])

  const stockTabs = useMemo(
    () => [STOCK_TAB_ALL, ...companyFilter],
    [companyFilter],
  )

  useEffect(() => {
    if (!stockTabs.includes(activeStockTab)) {
      setActiveStockTab(STOCK_TAB_ALL)
    }
  }, [activeStockTab, stockTabs])

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
        <SectionTitle>주식수 필터 (회사별)</SectionTitle>
        <HintText>
          전체 탭은 공통 주식수 구간, 회사 탭은 회사별로 다른 구간을 설정합니다.
        </HintText>
        {!isAdmin && !useListScopedMenu && (
          <HintText style={{ marginTop: "0.35rem" }}>
            * 현장요원 권한에 따라 회사/상태 목록이 다르게 보일 수 있습니다.
          </HintText>
        )}
        <StockTabRow>
          {stockTabs.map((tab) => (
            <StockTabButton
              key={tab}
              isActive={activeStockTab === tab}
              onClick={() => setActiveStockTab(tab)}>
              {tab === STOCK_TAB_ALL ? "전체" : tab}
            </StockTabButton>
          ))}
        </StockTabRow>

        {activeStockTab === STOCK_TAB_ALL ? (
          globalStockRanges.length === 0 ? (
            <HintText style={{ marginTop: "0.5rem" }}>
              현재 조건에서 사용할 수 있는 주식수 데이터가 없습니다.
            </HintText>
          ) : (
            <CompanyStockSection>
              <CompanyStockTitle>전체 구간</CompanyStockTitle>
              <StockRangeWrapper>
                {globalStockRanges.map((range) => (
                  <StockRangeButton
                    key={`all-${range.label}`}
                    isSelected={stocks.some(
                      (s) => s.start === range.start && s.end === range.end,
                    )}
                    onClick={() => {
                      setStocks((prev) => {
                        const exists = prev.some(
                          (s) => s.start === range.start && s.end === range.end,
                        )
                        if (exists) {
                          return prev.filter(
                            (s) =>
                              !(s.start === range.start && s.end === range.end),
                          )
                        }

                        return [...prev, { start: range.start, end: range.end }]
                      })
                    }}>
                    {range.label}
                  </StockRangeButton>
                ))}
              </StockRangeWrapper>
            </CompanyStockSection>
          )
        ) : (
          <CompanyStockSection>
            <CompanyStockTitle>{activeStockTab}</CompanyStockTitle>
            <StockRangeWrapper>
              {(companySpecificRanges[activeStockTab] ?? []).map((range) => (
                <StockRangeButton
                  key={`${activeStockTab}-${range.label}`}
                  isSelected={(
                    companyStockFilterMap[activeStockTab] ?? []
                  ).some((s) => s.start === range.start && s.end === range.end)}
                  onClick={() =>
                    handleCompanyRangeSelect(
                      activeStockTab,
                      range.start,
                      range.end,
                    )
                  }>
                  {range.label}
                </StockRangeButton>
              ))}
            </StockRangeWrapper>
          </CompanyStockSection>
        )}
      </FilterSection>

      <ButtonGroup>
        <ResetButton
          onClick={() => {
            if (workspaceId) {
              const keys = getMapStorageKeys(workspaceId)
              localStorage.setItem(keys.level, "6")
              localStorage.setItem(
                keys.position,
                JSON.stringify({ lat: 37.5665, lng: 126.978 }),
              )
            }
            resetFilters()
            setStocks([])
            setCompanyStockFilterMap({})
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
  position: relative;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 88px;

  @media (max-width: 768px) {
    padding: 16px;
    padding-bottom: calc(88px + env(safe-area-inset-bottom));
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
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-width: 2.75rem;
  min-height: 2.75rem;
  -webkit-tap-highlight-color: transparent;

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

  @media (max-width: 768px) {
    margin-bottom: 8px;
  }
`

const HintText = styled.p`
  margin: 0;
  color: ${COLORS.gray[500]};
  font-size: 0.875rem;
  line-height: 1.4;
`

const CompanyStockSection = styled.div`
  padding: 0.75rem 0;
`

const CompanyStockTitle = styled.h4`
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: ${COLORS.gray[700]};
  font-weight: 600;
`

const StockTabRow = styled.div`
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

const StockTabButton = styled.button<{ isActive: boolean }>`
  border: 1px solid ${(p) => (p.isActive ? COLORS.blue[500] : COLORS.gray[300])};
  background: ${(p) => (p.isActive ? COLORS.blue[50] : "#fff")};
  color: ${(p) => (p.isActive ? COLORS.blue[700] : COLORS.gray[700])};
  border-radius: 999px;
  min-height: 2.25rem;
  padding: 0.4rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
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
  min-height: 2.5rem;
  -webkit-tap-highlight-color: transparent;

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
  min-height: 2.75rem;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${(props) =>
      props.isSelected ? COLORS.blue[100] : COLORS.gray[50]};
  }
`

const ButtonGroup = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-top: 24px;
  padding-top: 0.75rem;
  padding-bottom: max(0.25rem, env(safe-area-inset-bottom));
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), #fff 28%);

  @media (max-width: 768px) {
    margin-top: 16px;
  }
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
  min-height: 2.75rem;
  -webkit-tap-highlight-color: transparent;

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
  min-height: 2.75rem;
  min-width: 6rem;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${COLORS.blue[600]};
  }
`

export default FilterModalChildren
