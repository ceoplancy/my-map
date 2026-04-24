import { useEffect, useMemo, useState } from "react"
import isEqual from "lodash/isEqual"
import { useGetFilterMenu } from "@/api/supabase"
import {
  useCompanyStockStatsForLists,
  useFilterMenuForLists,
} from "@/api/workspace"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { Clear as ClearIcon } from "@mui/icons-material"
import { Alert } from "@mui/material"
import { useGetUserData } from "@/api/auth"
import { getMapStorageKeys } from "@/constants/map-storage"
import { getFilterSummaryChips } from "@/lib/filterSummaryChips"
import {
  PRIMARY_STATUS_OPTIONS,
  getPrimaryStatusCategory,
  type PrimaryStatus,
} from "@/lib/shareholderStatus"
import {
  useFilterStore,
  type CompanyFilterProfile,
  type FilterPersistableFields,
  getDefaultFilterPersistable,
  getFilterPersistableSnapshotFromStore,
} from "@/store/filterState"
import { toast } from "react-toastify"

interface FilterModalChildrenProps {
  handleClose: () => void
  handleApplyFilters: () => void

  /** 열릴 때마다 스토어에서 draft 로드 (미리보기). 적용하기 전까지 지도·스토어 미반영 */
  modalOpen: boolean

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

const MAIN_TAB_ALL = "__main_all__"

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

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((v): v is string => typeof v === "string")
}

const toStockRangeArray = (
  value: unknown,
): { start: number; end: number }[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (v): v is { start: number; end: number } =>
      !!v &&
      typeof v === "object" &&
      typeof (v as { start?: unknown }).start === "number" &&
      typeof (v as { end?: unknown }).end === "number",
  )
}

const toCompanyStockMap = (
  value: unknown,
): Record<string, { start: number; end: number }[]> => {
  if (!value || typeof value !== "object") {
    return {}
  }

  const result: Record<string, { start: number; end: number }[]> = {}
  for (const [key, ranges] of Object.entries(value)) {
    result[key] = toStockRangeArray(ranges)
  }

  return result
}

function sanitizeDraftForApply(
  draft: FilterPersistableFields,
  ctx: {
    isAdmin: boolean
    useListScopedMenu: boolean
    allowedCompany: string[]
    availableStatus: string[]
    availableCompany: string[]
  },
): FilterPersistableFields {
  const next = structuredClone(draft)
  if (!ctx.isAdmin && !ctx.useListScopedMenu) {
    next.companyFilter = next.companyFilter.filter((c) =>
      ctx.allowedCompany.includes(c),
    )
    const allowedPrimaries = new Set(
      ctx.availableStatus.map((s) => getPrimaryStatusCategory(s)),
    )
    next.statusPrimaryFilter = next.statusPrimaryFilter.filter((p) =>
      allowedPrimaries.has(p),
    )
  }
  const allowed = new Set(ctx.availableCompany)
  next.companyStockFilterMap = Object.fromEntries(
    Object.entries(next.companyStockFilterMap).filter(([k]) => allowed.has(k)),
  )
  next.companyFilterProfiles = Object.fromEntries(
    Object.entries(next.companyFilterProfiles).filter(([k]) => allowed.has(k)),
  )

  return next
}

const FilterModalChildren = ({
  handleClose,
  handleApplyFilters,
  modalOpen,
  listIds,
  workspaceId,
}: FilterModalChildrenProps) => {
  const {
    setStatusFilter,
    setStatusPrimaryFilter,
    setCompanyFilter,
    setMakerFilter,
    setCityFilter,
    setStocks,
    setCompanyStockFilterMap,
    setCompanyFilterProfiles,
  } = useFilterStore()

  const [draft, setDraft] = useState<FilterPersistableFields>(() =>
    getDefaultFilterPersistable(),
  )
  const [baseline, setBaseline] = useState<FilterPersistableFields | null>(null)

  const [activeMainTab, setActiveMainTab] = useState<string>(MAIN_TAB_ALL)
  const [manualMin, setManualMin] = useState("")
  const [manualMax, setManualMax] = useState("")
  const [profileManualMin, setProfileManualMin] = useState("")
  const [profileManualMax, setProfileManualMax] = useState("")

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
  const safeCompanyFilter = useMemo(
    () => toStringArray(draft.companyFilter),
    [draft.companyFilter],
  )
  const safeStocks = useMemo(
    () => toStockRangeArray(draft.stocks),
    [draft.stocks],
  )
  const safeStatusPrimaryFilter = useMemo(
    () =>
      toStringArray(draft.statusPrimaryFilter).filter((s): s is PrimaryStatus =>
        (PRIMARY_STATUS_OPTIONS as readonly string[]).includes(s),
      ),
    [draft.statusPrimaryFilter],
  )

  useEffect(() => {
    if (!modalOpen) return
    const snap = getFilterPersistableSnapshotFromStore(
      useFilterStore.getState(),
    )
    setDraft(snap)
    setBaseline(snap)
    setActiveMainTab(MAIN_TAB_ALL)
    setManualMin("")
    setManualMax("")
    setProfileManualMin("")
    setProfileManualMax("")
  }, [modalOpen])

  const draftChips = useMemo(
    () =>
      getFilterSummaryChips({
        cityFilter: draft.cityFilter,
        statusPrimaryFilter: draft.statusPrimaryFilter,
        companyFilter: draft.companyFilter,
        companyFilterProfiles: draft.companyFilterProfiles,
        stocks: draft.stocks,
        companyStockFilterMap: draft.companyStockFilterMap,
      }),
    [draft],
  )

  const savedChips = useMemo(() => {
    if (!baseline) return []

    return getFilterSummaryChips({
      cityFilter: baseline.cityFilter,
      statusPrimaryFilter: baseline.statusPrimaryFilter,
      companyFilter: baseline.companyFilter,
      companyFilterProfiles: baseline.companyFilterProfiles,
      stocks: baseline.stocks,
      companyStockFilterMap: baseline.companyStockFilterMap,
    })
  }, [baseline])

  const isDirty = useMemo(
    () => baseline !== null && !isEqual(draft, baseline),
    [draft, baseline],
  )

  const statusMenu = useMemo(
    () =>
      (useListScopedMenu
        ? filterMenuForLists?.statusMenu
        : filterMenu?.statusMenu) ?? [],
    [useListScopedMenu, filterMenuForLists?.statusMenu, filterMenu?.statusMenu],
  )
  const companyMenu = useMemo(
    () =>
      (useListScopedMenu
        ? filterMenuForLists?.companyMenu
        : filterMenu?.companyMenu) ?? [],
    [
      useListScopedMenu,
      filterMenuForLists?.companyMenu,
      filterMenu?.companyMenu,
    ],
  )

  const allowedStatus = useMemo(
    () => toStringArray(user?.user?.user_metadata?.allowedStatus),
    [user?.user?.user_metadata?.allowedStatus],
  )

  const allowedCompany = useMemo(
    () => toStringArray(user?.user?.user_metadata?.allowedCompany),
    [user?.user?.user_metadata?.allowedCompany],
  )

  const availableStatus = useMemo(
    () =>
      isAdmin || useListScopedMenu
        ? statusMenu
        : statusMenu.filter((status) => allowedStatus.includes(status)),
    [isAdmin, useListScopedMenu, statusMenu, allowedStatus],
  )

  const availableCompany = useMemo(
    () =>
      isAdmin || useListScopedMenu
        ? companyMenu
        : companyMenu.filter((company) => allowedCompany.includes(company)),
    [isAdmin, useListScopedMenu, companyMenu, allowedCompany],
  )

  const availablePrimary = useMemo(() => {
    if (isAdmin || useListScopedMenu) return [...PRIMARY_STATUS_OPTIONS]
    const set = new Set<PrimaryStatus>()
    for (const s of availableStatus) {
      set.add(getPrimaryStatusCategory(s))
    }
    const filtered = PRIMARY_STATUS_OPTIONS.filter((p) => set.has(p))

    return filtered.length > 0 ? filtered : [...PRIMARY_STATUS_OPTIONS]
  }, [isAdmin, useListScopedMenu, availableStatus])

  const mainTabs = useMemo(
    () => [MAIN_TAB_ALL, ...availableCompany],
    [availableCompany],
  )

  useEffect(() => {
    if (!mainTabs.includes(activeMainTab)) {
      setActiveMainTab(MAIN_TAB_ALL)
    }
  }, [activeMainTab, mainTabs])

  const targetCompaniesForGlobalStocks = useMemo(() => {
    return safeCompanyFilter.length > 0 ? safeCompanyFilter : availableCompany
  }, [safeCompanyFilter, availableCompany])

  const globalStockRanges = useMemo(() => {
    const statsRows = targetCompaniesForGlobalStocks
      .map((company) => companyStockStats[company])
      .filter(Boolean)
    if (statsRows.length === 0) return []
    const min = Math.min(...statsRows.map((s) => s.min))
    const max = Math.max(...statsRows.map((s) => s.max))

    return buildAdaptiveRanges(min, max)
  }, [targetCompaniesForGlobalStocks, companyStockStats])

  const activeCompany = activeMainTab !== MAIN_TAB_ALL ? activeMainTab : null

  const companySpecificRanges = useMemo(() => {
    if (!activeCompany) return []
    const stats = companyStockStats[activeCompany]
    if (!stats) return []

    return buildAdaptiveRanges(stats.min, stats.max)
  }, [activeCompany, companyStockStats])

  const profileForActive: CompanyFilterProfile = useMemo(() => {
    if (!activeCompany) return {}

    return draft.companyFilterProfiles[activeCompany] ?? {}
  }, [activeCompany, draft.companyFilterProfiles])

  const profileStockRanges = profileForActive.stockRanges ?? []
  const profileStatusPrimary = profileForActive.statusPrimary
  const profileCity = profileForActive.city

  const toggleGlobalPrimary = (p: PrimaryStatus) => {
    setDraft((prev) => {
      const next = prev.statusPrimaryFilter.includes(p)
        ? prev.statusPrimaryFilter.filter((x) => x !== p)
        : [...prev.statusPrimaryFilter, p]

      return {
        ...prev,
        statusPrimaryFilter: next,
        statusFilter: [],
      }
    })
  }

  const toggleProfilePrimary = (company: string, p: PrimaryStatus) => {
    setDraft((d) => {
      const prev = d.companyFilterProfiles
      const base = { ...(prev[company] ?? {}) }
      const cur = base.statusPrimary
      const arr = cur === undefined ? [] : [...cur]
      const nextArr = arr.includes(p) ? arr.filter((x) => x !== p) : [...arr, p]
      let nextProfiles = { ...prev }
      if (nextArr.length === 0) {
        const { statusPrimary: _omit, ...rest } = base
        void _omit
        const nextProf = { ...rest }
        if (Object.keys(nextProf).length === 0) {
          const clone = { ...nextProfiles }
          delete clone[company]
          nextProfiles = clone
        } else {
          nextProfiles = { ...nextProfiles, [company]: nextProf }
        }
      } else {
        nextProfiles = {
          ...nextProfiles,
          [company]: { ...base, statusPrimary: nextArr },
        }
      }
      const nextMap = { ...d.companyStockFilterMap }
      delete nextMap[company]

      return {
        ...d,
        companyFilterProfiles: nextProfiles,
        companyStockFilterMap: nextMap,
      }
    })
  }

  const clearProfileField = (
    company: string,
    field: keyof CompanyFilterProfile,
  ) => {
    setDraft((d) => {
      const prev = d.companyFilterProfiles
      const base = { ...(prev[company] ?? {}) }
      delete base[field]
      if (Object.keys(base).length === 0) {
        const clone = { ...prev }
        delete clone[company]

        return { ...d, companyFilterProfiles: clone }
      }

      return {
        ...d,
        companyFilterProfiles: { ...prev, [company]: base },
      }
    })
  }

  const handleCompanyRangeSelect = (
    company: string,
    start: number,
    end: number,
  ) => {
    setDraft((d) => {
      const prev = d.companyFilterProfiles
      const base = { ...(prev[company] ?? {}) }
      const current = base.stockRanges ?? []
      const exists = current.some((r) => r.start === start && r.end === end)
      const nextForCompany = exists
        ? current.filter((r) => !(r.start === start && r.end === end))
        : [...current, { start, end }]
      let nextProfiles = { ...prev }
      if (nextForCompany.length === 0) {
        const { stockRanges: _sr, ...rest } = base
        void _sr
        if (Object.keys(rest).length === 0) {
          const clone = { ...nextProfiles }
          delete clone[company]
          nextProfiles = clone
        } else {
          nextProfiles = { ...nextProfiles, [company]: rest }
        }
      } else {
        nextProfiles = {
          ...nextProfiles,
          [company]: { ...base, stockRanges: nextForCompany },
        }
      }
      const nextMap = { ...d.companyStockFilterMap }
      delete nextMap[company]

      return {
        ...d,
        companyFilterProfiles: nextProfiles,
        companyStockFilterMap: nextMap,
      }
    })
  }

  const handleCompanyFilter = (selectedCompany: string) => {
    setDraft((d) => {
      const safePrev = toStringArray(d.companyFilter)
      if (safePrev.includes(selectedCompany)) {
        const nextMap = { ...toCompanyStockMap(d.companyStockFilterMap) }
        delete nextMap[selectedCompany]
        const nextProf = { ...d.companyFilterProfiles }
        delete nextProf[selectedCompany]

        return {
          ...d,
          companyFilter: safePrev.filter((c) => c !== selectedCompany),
          companyStockFilterMap: nextMap,
          companyFilterProfiles: nextProf,
        }
      }

      return {
        ...d,
        companyFilter: [...safePrev, selectedCompany],
      }
    })
  }

  const addGlobalManualRange = () => {
    const a = parseInt(manualMin.replace(/,/g, ""), 10)
    const b = parseInt(manualMax.replace(/,/g, ""), 10)
    if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) {
      toast.error("최소·최대 주식수를 올바르게 입력해 주세요.")

      return
    }
    const end = b >= 999_999_999_999 ? Number.MAX_SAFE_INTEGER : b
    setDraft((prev) => {
      const safePrev = toStockRangeArray(prev.stocks)

      return {
        ...prev,
        stocks: [...safePrev, { start: a, end }],
      }
    })
    setManualMin("")
    setManualMax("")
  }

  const commitDraftToStore = () => {
    const sanitized = sanitizeDraftForApply(draft, {
      isAdmin,
      useListScopedMenu,
      allowedCompany,
      availableStatus,
      availableCompany,
    })
    setStatusFilter(
      sanitized.statusPrimaryFilter.length > 0 ? [] : sanitized.statusFilter,
    )
    setStatusPrimaryFilter(sanitized.statusPrimaryFilter)
    setCompanyFilter(sanitized.companyFilter)
    setMakerFilter(sanitized.makerFilter)
    setCityFilter(sanitized.cityFilter)
    setStocks(sanitized.stocks)
    setCompanyStockFilterMap(sanitized.companyStockFilterMap)
    setCompanyFilterProfiles(sanitized.companyFilterProfiles)
    handleApplyFilters()
  }

  const addProfileManualRange = (company: string) => {
    const a = parseInt(profileManualMin.replace(/,/g, ""), 10)
    const b = parseInt(profileManualMax.replace(/,/g, ""), 10)
    if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) {
      toast.error("최소·최대 주식수를 올바르게 입력해 주세요.")

      return
    }
    const end = b >= 999_999_999_999 ? Number.MAX_SAFE_INTEGER : b
    handleCompanyRangeSelect(company, a, end)
    setProfileManualMin("")
    setProfileManualMax("")
  }

  const isAllTab = activeMainTab === MAIN_TAB_ALL

  return (
    <FilterRoot>
      <FilterScroll>
        <ModalHeader>
          <ModalTitle>필터 설정</ModalTitle>
          <CloseButton onClick={handleClose}>
            <ClearIcon />
          </CloseButton>
        </ModalHeader>

        <SummarySection>
          <SummaryRow>
            <SummaryLabel>미리보기 (대시보드와 동일 칩)</SummaryLabel>
            {draftChips.length > 0 ? (
              <SummaryChips aria-label="편집 중 필터 요약">
                {draftChips.map((text, i) => (
                  <SummaryChip key={`${text}-${i}`}>{text}</SummaryChip>
                ))}
              </SummaryChips>
            ) : (
              <SummaryMuted>조건 없음 · 전체 명부</SummaryMuted>
            )}
          </SummaryRow>
          {isDirty && baseline && (
            <SavedCompareRow>
              <SavedCompareLabel>지도에 적용 중 (저장됨)</SavedCompareLabel>
              {savedChips.length > 0 ? (
                <SummaryChips>
                  {savedChips.map((text, i) => (
                    <SavedChip key={`${text}-${i}`}>{text}</SavedChip>
                  ))}
                </SummaryChips>
              ) : (
                <SummaryMuted>조건 없음 · 전체 명부</SummaryMuted>
              )}
            </SavedCompareRow>
          )}
          <SummaryHint>
            적용하기를 눌러야 지도·대시보드에 반영됩니다. 닫기 시 편집 내용은
            저장되지 않습니다.
          </SummaryHint>
        </SummarySection>

        <MainTabRow>
          {mainTabs.map((tab) => (
            <MainTabButton
              key={tab}
              type="button"
              isActive={activeMainTab === tab}
              onClick={() => setActiveMainTab(tab)}>
              {tab === MAIN_TAB_ALL ? "전체" : tab}
            </MainTabButton>
          ))}
        </MainTabRow>

        {isAllTab ? (
          <>
            <FilterSection>
              <SectionTitle>회사 범위 (지도에 표시할 회사)</SectionTitle>
              <HintText>
                선택하지 않으면 명부에 있는 모든 회사가 대상입니다.
              </HintText>
              <ChipsWrapper>
                {availableCompany.map((company) => (
                  <FilterChip
                    key={company}
                    isSelected={safeCompanyFilter.includes(company)}
                    onClick={() => handleCompanyFilter(company)}>
                    {company}
                  </FilterChip>
                ))}
              </ChipsWrapper>
            </FilterSection>

            <FilterSection>
              <SectionTitle>지역 (주소에 포함된 문자)</SectionTitle>
              <Alert severity="info" sx={{ mb: 2 }}>
                현재 지도에서 보고 있는 지역을 기준으로 필터링됩니다(서울을 보고
                있는데 부산으로 필터링되면 &apos;부산&apos;이 포함된 서울 지역만
                필터링됩니다).
              </Alert>
              <ChipsWrapper>
                <FilterChip
                  isSelected={draft.cityFilter === ""}
                  onClick={() => {
                    setDraft((d) => ({ ...d, cityFilter: "" }))
                  }}>
                  전체
                </FilterChip>
                {MAJOR_CITIES.map((city) => (
                  <FilterChip
                    key={city}
                    isSelected={draft.cityFilter?.includes(city)}
                    onClick={() => {
                      setDraft((d) => ({ ...d, cityFilter: city }))
                    }}>
                    {city}
                  </FilterChip>
                ))}
              </ChipsWrapper>
            </FilterSection>

            <FilterSection>
              <SectionTitle>상태 (1차)</SectionTitle>
              <HintText>
                상세 상태 대신 미방문·완료·전자투표·주주총회 등 묶음으로
                고릅니다. 회사별로 다르게 쓰려면 아래 회사 탭에서 설정하세요.
              </HintText>
              <ChipsWrapper>
                {availablePrimary.map((p) => (
                  <FilterChip
                    key={p}
                    isSelected={safeStatusPrimaryFilter.includes(p)}
                    onClick={() => toggleGlobalPrimary(p)}>
                    {p}
                  </FilterChip>
                ))}
              </ChipsWrapper>
            </FilterSection>

            <FilterSection>
              <SectionTitle>주식수 (전체 공통)</SectionTitle>
              <HintText>
                선택한 회사 범위가 있으면 그 회사들의 분포로 추천 구간을
                만듭니다. 회사 탭에서 회사별 구간을 따로 둘 수 있습니다.
              </HintText>
              {!isAdmin && !useListScopedMenu && (
                <HintText style={{ marginTop: "0.35rem" }}>
                  * 현장요원 권한에 따라 회사·상태 목록이 다르게 보일 수
                  있습니다.
                </HintText>
              )}

              <ManualBlock $first>
                <ManualTitle>직접 입력</ManualTitle>
                <ManualRow>
                  <ManualInput
                    type="text"
                    inputMode="numeric"
                    placeholder="최소"
                    value={manualMin}
                    onChange={(e) => setManualMin(e.target.value)}
                  />
                  <ManualSep>~</ManualSep>
                  <ManualInput
                    type="text"
                    inputMode="numeric"
                    placeholder="최대"
                    value={manualMax}
                    onChange={(e) => setManualMax(e.target.value)}
                  />
                  <ManualAddButton type="button" onClick={addGlobalManualRange}>
                    구간 추가
                  </ManualAddButton>
                </ManualRow>
                <ManualHint>
                  상한을 크게 두려면 최대에 큰 숫자를 입력하세요.
                </ManualHint>
              </ManualBlock>

              {globalStockRanges.length === 0 ? (
                <HintText style={{ marginTop: "0.75rem" }}>
                  현재 조건에서 사용할 수 있는 추천 주식수 구간이 없습니다.
                  위에서 직접 구간을 추가해 보세요.
                </HintText>
              ) : (
                <CompanyStockSection>
                  <CompanyStockTitle>추천 구간</CompanyStockTitle>
                  <StockRangeWrapper>
                    {globalStockRanges.map((range) => (
                      <StockRangeButton
                        key={`all-${range.label}`}
                        isSelected={safeStocks.some(
                          (s) => s.start === range.start && s.end === range.end,
                        )}
                        onClick={() => {
                          setDraft((d) => {
                            const safePrev = toStockRangeArray(d.stocks)
                            const exists = safePrev.some(
                              (s) =>
                                s.start === range.start && s.end === range.end,
                            )
                            const nextStocks = exists
                              ? safePrev.filter(
                                  (s) =>
                                    !(
                                      s.start === range.start &&
                                      s.end === range.end
                                    ),
                                )
                              : [
                                  ...safePrev,
                                  { start: range.start, end: range.end },
                                ]

                            return { ...d, stocks: nextStocks }
                          })
                        }}>
                        {range.label}
                      </StockRangeButton>
                    ))}
                  </StockRangeWrapper>
                </CompanyStockSection>
              )}
            </FilterSection>
          </>
        ) : (
          activeCompany && (
            <>
              <FilterSection>
                <SectionTitle>{activeCompany} · 상태 (1차)</SectionTitle>
                <HintText>
                  이 회사 주주에만 적용됩니다. 비우면 &apos;전체&apos; 탭의 상태
                  규칙을 따릅니다.
                </HintText>
                <ChipsWrapper>
                  {availablePrimary.map((p) => {
                    const selected =
                      profileStatusPrimary !== undefined &&
                      (profileStatusPrimary ?? []).includes(p)

                    return (
                      <FilterChip
                        key={p}
                        isSelected={selected}
                        onClick={() => toggleProfilePrimary(activeCompany, p)}>
                        {p}
                      </FilterChip>
                    )
                  })}
                </ChipsWrapper>
                {profileStatusPrimary !== undefined &&
                  profileStatusPrimary.length > 0 && (
                    <GhostButton
                      type="button"
                      onClick={() =>
                        clearProfileField(activeCompany, "statusPrimary")
                      }>
                      전 지역 (이 회사만 초기화)
                    </GhostButton>
                  )}
              </FilterSection>

              <FilterSection>
                <SectionTitle>{activeCompany} · 지역</SectionTitle>
                <HintText>
                  비우면 전 지역으로 봅니다. 이 회사만 다른 지역을 보려면
                  선택하세요.
                </HintText>
                <ChipsWrapper>
                  <FilterChip
                    isSelected={profileCity === undefined}
                    onClick={() => clearProfileField(activeCompany, "city")}>
                    전 지역
                  </FilterChip>
                  {MAJOR_CITIES.map((city) => (
                    <FilterChip
                      key={city}
                      isSelected={profileCity === city}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          companyFilterProfiles: {
                            ...d.companyFilterProfiles,
                            [activeCompany]: {
                              ...(d.companyFilterProfiles[activeCompany] ?? {}),
                              city,
                            },
                          },
                        }))
                      }>
                      {city}
                    </FilterChip>
                  ))}
                </ChipsWrapper>
              </FilterSection>

              <FilterSection>
                <SectionTitle>{activeCompany} · 주식수</SectionTitle>
                <HintText>
                  여기서 고르면 이 회사에는 전체 탭 주식 필터 대신 이 구간만
                  적용됩니다.
                </HintText>

                <ManualBlock $first>
                  <ManualTitle>직접 입력</ManualTitle>
                  <ManualRow>
                    <ManualInput
                      type="text"
                      inputMode="numeric"
                      placeholder="최소"
                      value={profileManualMin}
                      onChange={(e) => setProfileManualMin(e.target.value)}
                    />
                    <ManualSep>~</ManualSep>
                    <ManualInput
                      type="text"
                      inputMode="numeric"
                      placeholder="최대"
                      value={profileManualMax}
                      onChange={(e) => setProfileManualMax(e.target.value)}
                    />
                    <ManualAddButton
                      type="button"
                      onClick={() => addProfileManualRange(activeCompany)}>
                      구간 추가
                    </ManualAddButton>
                  </ManualRow>
                </ManualBlock>

                {companySpecificRanges.length === 0 ? (
                  <HintText style={{ marginTop: "0.75rem" }}>
                    이 회사의 주식수 분포를 불러오지 못했습니다. 위에서 직접
                    구간을 추가할 수 있습니다.
                  </HintText>
                ) : (
                  <CompanyStockSection>
                    <CompanyStockTitle>추천 구간</CompanyStockTitle>
                    <StockRangeWrapper>
                      {companySpecificRanges.map((range) => (
                        <StockRangeButton
                          key={`${activeCompany}-${range.label}`}
                          isSelected={profileStockRanges.some(
                            (s) =>
                              s.start === range.start && s.end === range.end,
                          )}
                          onClick={() =>
                            handleCompanyRangeSelect(
                              activeCompany,
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
                {profileStockRanges.length > 0 && (
                  <GhostButton
                    type="button"
                    onClick={() =>
                      clearProfileField(activeCompany, "stockRanges")
                    }>
                    전체 탭 주식 규칙 따르기
                  </GhostButton>
                )}
              </FilterSection>
            </>
          )
        )}
      </FilterScroll>
      <FooterBar>
        <FooterActions>
          <ResetButton
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  "필터 미리보기를 초기화할까요? (지도·대시보드에는 적용하기를 눌러야 반영됩니다.)",
                )
              ) {
                return
              }
              if (workspaceId) {
                const keys = getMapStorageKeys(workspaceId)
                localStorage.setItem(keys.level, "6")
                localStorage.setItem(
                  keys.position,
                  JSON.stringify({ lat: 37.5665, lng: 126.978 }),
                )
              }
              setDraft(getDefaultFilterPersistable())
              setActiveMainTab(MAIN_TAB_ALL)
              setManualMin("")
              setManualMax("")
              setProfileManualMin("")
              setProfileManualMax("")
            }}>
            필터 초기화
          </ResetButton>
          <ApplyButton type="button" onClick={commitDraftToStore}>
            적용하기
          </ApplyButton>
        </FooterActions>
      </FooterBar>
    </FilterRoot>
  )
}

const SummarySection = styled.div`
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid ${COLORS.gray[100]};
`

const SummaryRow = styled.div`
  margin-bottom: 8px;

  &:last-of-type {
    margin-bottom: 0;
  }
`

const SummaryLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${COLORS.gray[600]};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
`

const SummaryChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const SummaryChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  color: ${COLORS.blue[800]};
  background: #fff;
  border: 1px solid ${COLORS.blue[200]};
`

const SavedChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  color: ${COLORS.gray[700]};
  background: #fff;
  border: 1px solid ${COLORS.gray[200]};
`

const SummaryMuted = styled.div`
  font-size: 0.75rem;
  color: ${COLORS.gray[500]};
`

const SavedCompareRow = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed ${COLORS.gray[200]};
`

const SavedCompareLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${COLORS.gray[500]};
  margin-bottom: 6px;
`

const SummaryHint = styled.p`
  margin: 10px 0 0;
  font-size: 0.6875rem;
  color: ${COLORS.gray[500]};
  line-height: 1.45;
`

const FilterRoot = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-height: min(78vh, 720px);
  overflow: hidden;

  @media (max-width: 768px) {
    max-height: none;
    flex: 1;
  }
`

const FilterScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
  padding-bottom: 12px;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    padding: 16px;
    padding-bottom: 10px;
  }
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

const MainTabRow = styled.div`
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 4px;
  margin-bottom: 20px;
  padding: 0 4px 2px;
  border-bottom: 1px solid ${COLORS.gray[100]};
`

const MainTabButton = styled.button<{ isActive: boolean }>`
  flex: 0 0 auto;
  scroll-snap-align: start;
  border: none;
  background: transparent;
  color: ${(p) => (p.isActive ? COLORS.blue[700] : COLORS.gray[600])};
  font-weight: ${(p) => (p.isActive ? 700 : 500)};
  font-size: 0.875rem;
  padding: 0.5rem 0.25rem 0.65rem;
  margin-bottom: -2px;
  border-bottom: 2px solid
    ${(p) => (p.isActive ? COLORS.blue[500] : "transparent")};
  cursor: pointer;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FilterSection = styled.div`
  margin-bottom: 28px;
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

const StockRangeWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const ChipsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

const FilterChip = styled.button<{ isSelected: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.875rem;
  border-radius: 999px;
  border: 1px solid
    ${(props) => (props.isSelected ? COLORS.blue[500] : COLORS.gray[200])};
  background: ${(props) => (props.isSelected ? COLORS.blue[50] : "white")};
  color: ${(props) => (props.isSelected ? COLORS.blue[700] : COLORS.gray[700])};
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 2.5rem;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${(props) =>
      props.isSelected ? COLORS.blue[100] : COLORS.gray[50]};
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

const ManualBlock = styled.div<{ $first?: boolean }>`
  margin-top: ${(p) => (p.$first ? "0.5rem" : "1rem")};
  padding: 12px;
  border-radius: 10px;
  background: ${COLORS.gray[50]};
  border: 1px solid ${COLORS.gray[100]};
`

const ManualTitle = styled.div`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  margin-bottom: 8px;
`

const ManualRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const ManualInput = styled.input`
  flex: 1 1 72px;
  min-width: 72px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${COLORS.gray[200]};
  font-size: 0.875rem;
  background: #fff;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[400]};
    box-shadow: 0 0 0 2px ${COLORS.blue[50]};
  }
`

const ManualSep = styled.span`
  color: ${COLORS.gray[400]};
  font-weight: 600;
  font-size: 0.875rem;
`

const ManualAddButton = styled.button`
  flex: 1 1 auto;
  min-width: 5.5rem;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid ${COLORS.blue[500]};
  background: #fff;
  color: ${COLORS.blue[700]};
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;

  &:hover {
    background: ${COLORS.blue[50]};
  }
`

const ManualHint = styled.p`
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: ${COLORS.gray[500]};
`

const GhostButton = styled.button`
  margin-top: 10px;
  padding: 0;
  border: none;
  background: none;
  color: ${COLORS.blue[600]};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: ${COLORS.blue[800]};
  }
`

const FooterBar = styled.div`
  flex-shrink: 0;
  padding: 12px 24px max(14px, env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid ${COLORS.gray[200]};
  box-shadow: 0 -8px 28px rgba(15, 23, 42, 0.08);

  @media (max-width: 768px) {
    padding-left: 16px;
    padding-right: 16px;
  }
`

const FooterActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: stretch;
`

const ResetButton = styled.button`
  flex: 0 0 auto;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid ${COLORS.gray[200]};
  background: #fff;
  color: ${COLORS.gray[700]};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease;
  min-height: 48px;

  &:hover {
    background: ${COLORS.gray[50]};
  }
`

const ApplyButton = styled.button`
  flex: 1;
  padding: 12px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(180deg, ${COLORS.blue[500]}, ${COLORS.blue[600]});
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  min-height: 48px;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;

  &:hover {
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.34);
  }

  &:active {
    transform: translateY(1px);
  }
`

export default FilterModalChildren
