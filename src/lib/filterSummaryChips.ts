import type { PrimaryStatus } from "@/lib/shareholderStatus"
import type {
  CompanyFilterProfiles,
  CompanyStockFilterMap,
  StockRange,
} from "@/store/filterState"

export type FilterSummaryInput = {
  cityFilter: string
  statusPrimaryFilter: PrimaryStatus[]
  companyFilter: string[]
  companyFilterProfiles: CompanyFilterProfiles
  stocks: StockRange[]
  companyStockFilterMap: CompanyStockFilterMap
}

/** 대시보드·필터 모달에서 동일한 칩 요약 문자열 배열 */
export function getFilterSummaryChips(input: FilterSummaryInput): string[] {
  const chips: string[] = []
  if (input.cityFilter) chips.push(input.cityFilter)
  if (input.statusPrimaryFilter?.length) {
    chips.push(...input.statusPrimaryFilter)
  }
  if (input.companyFilter?.length) {
    chips.push(
      input.companyFilter.length === 1
        ? input.companyFilter[0]
        : `회사 ${input.companyFilter.length}곳`,
    )
  }
  const profileKeys = Object.keys(input.companyFilterProfiles ?? {})
  if (profileKeys.length) {
    chips.push(`회사별 설정 ${profileKeys.length}`)
  }
  if (input.stocks?.length) {
    chips.push(`주식 구간 ${input.stocks.length}`)
  }
  if (
    Object.keys(input.companyStockFilterMap ?? {}).length > 0 &&
    profileKeys.length === 0
  ) {
    chips.push(
      `회사별 주식 ${Object.keys(input.companyStockFilterMap ?? {}).length}`,
    )
  }

  return chips
}
