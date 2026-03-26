import { useGetUsers } from "@/api/supabase"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import EditShareholderModal from "./EditShareholderModal"
import AddShareholderModal from "./AddShareholderModal"
import {
  ArrowUpward,
  ArrowDownward,
  FilterList,
  Search,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Download as DownloadIcon,
} from "@mui/icons-material"
import { toast } from "react-toastify"
import { reportError } from "@/lib/reportError"
import type { Tables } from "@/types/db"
import {
  useShareholders,
  useDeleteShareholder,
  useChangesForList,
  type LatestChange,
  type ChangeEntry,
} from "@/api/workspace"
import { useSession } from "@/api/auth"
import GlobalSpinner from "@/components/ui/global-spinner"
import Select from "@/components/ui/select"
import * as XLSX from "xlsx"
import { removeTags } from "@/lib/utils"

type Shareholder = Tables<"shareholders">

/** date input (YYYY-MM-DD) → 로컬 자정 ms */
function parseLocalDateStartMs(s: string): number | null {
  if (!s.trim()) return null
  const parts = s.split("-").map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
  const [y, m, d] = parts

  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

function parseLocalDateEndMs(s: string): number | null {
  if (!s.trim()) return null
  const parts = s.split("-").map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
  const [y, m, d] = parts

  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}

const Container = styled.div`
  background: white;
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
`

const TableWrapper = styled.div`
  overflow-x: auto;
  margin: 1rem;
`

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
`

const Th = styled.th`
  padding: 1rem;
  background: ${COLORS.gray[50]};
  color: ${COLORS.gray[700]};
  font-weight: 600;
  font-size: 0.875rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid ${COLORS.gray[200]};

  &:first-of-type {
    padding-left: 1.5rem;
  }

  &:last-of-type {
    padding-right: 1.5rem;
  }
`

const ThSortable = styled(Th)`
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.blue[600]};
  }

  > div {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  svg {
    font-size: 1rem;
    opacity: 0.5;
  }

  &:hover svg {
    opacity: 1;
  }
`

const Td = styled.td`
  padding: 1rem;
  color: ${COLORS.gray[700]};
  border-bottom: 1px solid ${COLORS.gray[100]};
  font-size: 0.875rem;

  &:first-of-type {
    padding-left: 1.5rem;
  }

  &:last-of-type {
    padding-right: 1.5rem;
  }
`

const Tr = styled.tr`
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[50]};
  }
`

const ActionButton = styled.button`
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &.edit {
    color: ${COLORS.blue[600]};
    background: ${COLORS.blue[50]};
    margin-right: 0.5rem;

    &:hover {
      background: ${COLORS.blue[100]};
    }
  }

  &.delete {
    color: ${COLORS.red[600]};
    background: ${COLORS.red[50]};

    &:hover {
      background: ${COLORS.red[100]};
    }
  }

  svg {
    font-size: 1.25rem;
  }
`

const FilterSection = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`

const FilterTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${COLORS.gray[900]};
  font-weight: 600;

  svg {
    color: ${COLORS.blue[500]};
  }
`

const SearchInputWrapper = styled.div`
  position: relative;
  flex: 1;
  max-width: 300px;

  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${COLORS.gray[400]};
    font-size: 1.25rem;
  }
`

const SearchInput = styled.input`
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  width: 100%;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid ${COLORS.gray[200]};
`

const PaginationInfo = styled.div`
  color: ${COLORS.gray[600]};
  font-size: 0.875rem;
`

const PaginationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`

const PageButton = styled.button<{ isActive?: boolean }>`
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  ${({ isActive }) =>
    isActive
      ? `
    background: ${COLORS.blue[500]};
    color: white;
    
    &:hover {
      background: ${COLORS.blue[600]};
    }
  `
      : `
    background: white;
    color: ${COLORS.gray[700]};
    border: 1px solid ${COLORS.gray[200]};
    
    &:hover {
      background: ${COLORS.gray[50]};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ITEMS_PER_PAGE = 10

const FilterContainer = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  flex-wrap: wrap;
`

const StocksRangeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const StocksInput = styled(SearchInput)`
  width: 120px;
  padding-left: 1rem;
`

const StocksSeparator = styled.span`
  color: ${COLORS.gray[400]};
`

const ClearFiltersButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: ${COLORS.gray[600]};
  background: ${COLORS.gray[50]};
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[100]};
    color: ${COLORS.gray[700]};
  }

  svg {
    font-size: 1.25rem;
  }
`

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: white;
  background: ${COLORS.green[600]};
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${COLORS.green[700]};
  }

  svg {
    font-size: 1.25rem;
  }
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${COLORS.gray[700]};
`

const FilterSelect = styled(Select)`
  width: 100%;
  &:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

type SortField = keyof Shareholder | "history_modifier" | "history_modified_at"

type SortConfig = {
  field: SortField | null
  direction: "asc" | "desc"
}

type Filters = {
  search: string
  status: string
  stocksMin: string
  stocksMax: string
  modifier: string

  /** YYYY-MM-DD, 변경 이력 없으면 shareholders.updated_at으로 비교 */
  modifiedFrom: string
  modifiedTo: string
}

type Props = { listId: string; listName?: string }

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background: ${COLORS.blue[500]};
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.blue[600]};
  }

  svg {
    font-size: 1.125rem;
  }
`

export default function ShareholderList({ listId, listName }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<Shareholder | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [sort, setSort] = useState<SortConfig>({
    field: null,
    direction: "asc",
  })
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    stocksMin: "",
    stocksMax: "",
    modifier: "",
    modifiedFrom: "",
    modifiedTo: "",
  })

  const { data: session } = useSession()
  const userId = session?.user?.id ?? ""
  const {
    data: shareholdersData,
    isPending: shareholdersPending,
    refetch,
  } = useShareholders({ listId })
  const { data: usersData } = useGetUsers(1, 100)
  const deleteShareholderMutation = useDeleteShareholder()
  const { data: changesData } = useChangesForList(listId)
  const latestChanges = useMemo(
    (): Record<string, LatestChange> => changesData?.latest ?? {},
    [changesData],
  )
  const allChanges = useMemo(
    (): Record<string, ChangeEntry[]> => changesData?.all ?? {},
    [changesData],
  )

  const usersMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const u of usersData?.users ?? []) {
      m[u.id] = u.user_metadata?.name || u.email || u.id
    }

    return m
  }, [usersData])

  const getLatestModifier = useCallback(
    (shareholderId: string) => {
      const entry = latestChanges[shareholderId]
      if (!entry) return "-"

      return usersMap[entry.changed_by] ?? entry.changed_by
    },
    [latestChanges, usersMap],
  )

  const getLatestModifiedDate = useCallback(
    (shareholderId: string) => {
      const entry = latestChanges[shareholderId]
      if (!entry) return "-"

      return entry.changed_at
    },
    [latestChanges],
  )

  const getComparableModifiedTimeMs = useCallback(
    (item: Shareholder): number | null => {
      const latest = latestChanges[item.id]
      if (latest?.changed_at) {
        const t = Date.parse(latest.changed_at)
        if (!Number.isNaN(t)) return t
      }
      if (item.updated_at) {
        const t = Date.parse(item.updated_at)
        if (!Number.isNaN(t)) return t
      }

      return null
    },
    [latestChanges],
  )

  const handleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setCurrentPage(1)
  }

  const filteredData = useMemo(() => {
    const rows = shareholdersData ?? []

    return rows.filter((item: Shareholder) => {
      const searchTerm = filters.search.trim().toLowerCase()
      const memoPlain = removeTags(item.memo ?? "").toLowerCase()
      const matchesSearch =
        searchTerm === "" ||
        item.company?.toLowerCase().includes(searchTerm) ||
        item.name?.toLowerCase().includes(searchTerm) ||
        memoPlain.includes(searchTerm) ||
        item.address?.toLowerCase().includes(searchTerm) ||
        item.latlngaddress?.toLowerCase().includes(searchTerm)

      const matchesStatus =
        filters.status === "" || item.status === filters.status

      const minN = filters.stocksMin.trim()
        ? parseInt(filters.stocksMin, 10)
        : NaN
      const maxN = filters.stocksMax.trim()
        ? parseInt(filters.stocksMax, 10)
        : NaN
      const matchesStocksMin =
        !filters.stocksMin.trim() ||
        (!Number.isNaN(minN) && item.stocks >= minN)
      const matchesStocksMax =
        !filters.stocksMax.trim() ||
        (!Number.isNaN(maxN) && item.stocks <= maxN)

      const matchesModifier =
        filters.modifier === "" ||
        latestChanges[item.id]?.changed_by === filters.modifier ||
        (allChanges[item.id]?.some((e) => e.changed_by === filters.modifier) ??
          false)

      const hasModifiedRange =
        Boolean(filters.modifiedFrom.trim()) ||
        Boolean(filters.modifiedTo.trim())
      const modifiedMs = getComparableModifiedTimeMs(item)
      let matchesModifiedRange = true
      if (hasModifiedRange) {
        if (modifiedMs === null) {
          matchesModifiedRange = false
        } else {
          const fromMs = parseLocalDateStartMs(filters.modifiedFrom)
          const toMs = parseLocalDateEndMs(filters.modifiedTo)
          if (fromMs !== null && modifiedMs < fromMs) {
            matchesModifiedRange = false
          }
          if (toMs !== null && modifiedMs > toMs) {
            matchesModifiedRange = false
          }
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesStocksMin &&
        matchesStocksMax &&
        matchesModifier &&
        matchesModifiedRange
      )
    })
  }, [
    shareholdersData,
    filters,
    latestChanges,
    allChanges,
    getComparableModifiedTimeMs,
  ])

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (!sort.field) return 0

      if (sort.field === "history_modifier") {
        const aModifier = getLatestModifier(a.id)
        const bModifier = getLatestModifier(b.id)

        if (aModifier === "-" && bModifier !== "-") return 1
        if (bModifier === "-" && aModifier !== "-") return -1
        if (aModifier === "-" && bModifier === "-") return 0

        const comparison =
          aModifier < bModifier ? -1 : aModifier > bModifier ? 1 : 0

        return sort.direction === "asc" ? comparison : -comparison
      }

      if (sort.field === "history_modified_at") {
        const aDate = getLatestModifiedDate(a.id)
        const bDate = getLatestModifiedDate(b.id)

        if (aDate === "-" && bDate !== "-") return 1
        if (bDate === "-" && aDate !== "-") return -1
        if (aDate === "-" && bDate === "-") return 0

        const comparison = aDate < bDate ? -1 : aDate > bDate ? 1 : 0

        return sort.direction === "asc" ? comparison : -comparison
      }

      const sortKey = sort.field
      const aValue = a[sortKey]
      const bValue = b[sortKey]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0

      return sort.direction === "asc" ? comparison : -comparison
    })
  }, [filteredData, sort, getLatestModifier, getLatestModifiedDate])

  const totalPages = Math.max(1, Math.ceil(sortedData.length / ITEMS_PER_PAGE))

  /** 정렬·필터 후 결과가 줄었을 때 현재 페이지가 범위를 벗어나면 빈 목록처럼 보이는 문제 방지 */
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedData.length / ITEMS_PER_PAGE))
    if (currentPage > maxPage) setCurrentPage(maxPage)
  }, [sortedData.length, currentPage])

  const focusAfterEditRef = useRef<string | null>(null)

  useEffect(() => {
    const id = focusAfterEditRef.current
    if (!id) return
    const idx = sortedData.findIndex((r) => r.id === id)
    if (idx >= 0) {
      setCurrentPage(Math.floor(idx / ITEMS_PER_PAGE) + 1)
      focusAfterEditRef.current = null

      return
    }
    const sharesReady = shareholdersData !== undefined
    const changesReady = changesData !== undefined
    if (sharesReady && changesReady) {
      focusAfterEditRef.current = null
    }
  }, [sortedData, shareholdersData, changesData])

  const handleModalClose = () => {
    const editedId = selectedItem?.id
    setSelectedItem(null)
    if (editedId) focusAfterEditRef.current = editedId
  }

  const handleDelete = async (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      try {
        await deleteShareholderMutation.mutateAsync(id)
        toast.success("성공적으로 삭제되었습니다.")
      } catch (error) {
        reportError(error, {
          toastMessage:
            "삭제 중 오류가 발생했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
        })
      }
    }
  }

  if (shareholdersPending && shareholdersData === undefined) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
      </div>
    )
  }

  const FIELD_LABELS: Record<string, string> = {
    name: "이름",
    company: "회사명",
    status: "상태",
    address: "주소",
    memo: "메모",
    stocks: "주식수",
    maker: "마커",
    latlngaddress: "기존 주소",
  }

  const formatHistoryForExport = (shareholderId: string): string => {
    const entries = allChanges[shareholderId]
    if (!entries?.length) return ""

    return entries
      .map((e) => {
        const who = usersMap[e.changed_by] ?? e.changed_by
        const label = FIELD_LABELS[e.field] ?? e.field

        return `[${e.changed_at}] ${who}: ${label} ${e.old_value ?? "-"} → ${e.new_value ?? "-"}`
      })
      .join("\n")
  }

  const handleExport = () => {
    const exportData = sortedData.map((item: Shareholder) => ({
      이름: item.name ?? "",
      회사명: item.company ?? "",
      주소: item.address ?? "",
      상태: item.status ?? "",
      주식수: item.stocks ?? 0,
      메모: item.memo ?? "",
      최종수정자: getLatestModifier(item.id),
      최종수정일: getLatestModifiedDate(item.id),
      변경이력: formatHistoryForExport(item.id),
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    ws["!cols"] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 40 },
      { wch: 8 },
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
      { wch: 28 },
      { wch: 60 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "주주명부")
    const prefix = listName ? `주주명부_${listName}` : "주주명부"
    XLSX.writeFile(
      wb,
      `${prefix}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
  }

  const currentData = sortedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  return (
    <Container>
      <FilterSection>
        <FilterHeader>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}>
            <FilterTitle>
              <FilterList />
              주주 목록
            </FilterTitle>
            <AddButton type="button" onClick={() => setAddModalOpen(true)}>
              <AddIcon />
              주주 추가
            </AddButton>
          </div>
          <SearchInputWrapper>
            <Search />
            <SearchInput
              placeholder="이름, 회사명, 주소, 메모로 검색..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </SearchInputWrapper>
        </FilterHeader>
        <FilterContainer>
          <FormGroup>
            <Label>상태</Label>
            <FilterSelect
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}>
              <option value="">모든 상태</option>
              <option value="미방문">미방문</option>
              <option value="완료">완료</option>
              <option value="보류">보류</option>
              <option value="실패">실패</option>
            </FilterSelect>
          </FormGroup>

          <FormGroup>
            <Label>주식수 범위</Label>
            <StocksRangeContainer>
              <StocksInput
                type="number"
                placeholder="최소"
                value={filters.stocksMin}
                onChange={(e) =>
                  handleFilterChange("stocksMin", e.target.value)
                }
              />
              <StocksSeparator>~</StocksSeparator>
              <StocksInput
                type="number"
                placeholder="최대"
                value={filters.stocksMax}
                onChange={(e) =>
                  handleFilterChange("stocksMax", e.target.value)
                }
              />
            </StocksRangeContainer>
          </FormGroup>

          <FormGroup>
            <Label>수정자</Label>
            <FilterSelect
              value={filters.modifier}
              onChange={(e) => handleFilterChange("modifier", e.target.value)}>
              <option value="">모든 수정자</option>
              {usersData?.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.user_metadata?.name || user.email}
                </option>
              ))}
            </FilterSelect>
          </FormGroup>

          <FormGroup>
            <Label>최종 수정일</Label>
            <StocksRangeContainer>
              <StocksInput
                type="date"
                aria-label="최종 수정일 시작"
                value={filters.modifiedFrom}
                onChange={(e) =>
                  handleFilterChange("modifiedFrom", e.target.value)
                }
              />
              <StocksSeparator>~</StocksSeparator>
              <StocksInput
                type="date"
                aria-label="최종 수정일 끝"
                value={filters.modifiedTo}
                onChange={(e) =>
                  handleFilterChange("modifiedTo", e.target.value)
                }
              />
            </StocksRangeContainer>
          </FormGroup>

          <ClearFiltersButton
            onClick={() => {
              setFilters({
                search: "",
                status: "",
                stocksMin: "",
                stocksMax: "",
                modifier: "",
                modifiedFrom: "",
                modifiedTo: "",
              })
              setCurrentPage(1)
            }}>
            <ClearIcon />
            필터 초기화
          </ClearFiltersButton>

          <ExportButton onClick={handleExport}>
            <DownloadIcon />
            .xlsx 내보내기
          </ExportButton>
        </FilterContainer>
      </FilterSection>

      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <ThSortable onClick={() => handleSort("name")}>
                <div>
                  이름
                  {sort.field === "name" &&
                    (sort.direction === "asc" ? (
                      <ArrowUpward />
                    ) : (
                      <ArrowDownward />
                    ))}
                </div>
              </ThSortable>
              <ThSortable onClick={() => handleSort("status")}>
                상태
                {sort.field === "status" &&
                  (sort.direction === "asc" ? (
                    <ArrowUpward />
                  ) : (
                    <ArrowDownward />
                  ))}
              </ThSortable>
              <ThSortable onClick={() => handleSort("stocks")}>
                주식수
                {sort.field === "stocks" &&
                  (sort.direction === "asc" ? (
                    <ArrowUpward />
                  ) : (
                    <ArrowDownward />
                  ))}
              </ThSortable>
              <ThSortable onClick={() => handleSort("address")}>
                <div>
                  주소
                  {sort.field === "address" &&
                    (sort.direction === "asc" ? (
                      <ArrowUpward />
                    ) : (
                      <ArrowDownward />
                    ))}
                </div>
              </ThSortable>
              <ThSortable onClick={() => handleSort("history_modifier")}>
                <div>
                  최종 수정자
                  {sort.field === "history_modifier" &&
                    (sort.direction === "asc" ? (
                      <ArrowUpward />
                    ) : (
                      <ArrowDownward />
                    ))}
                </div>
              </ThSortable>
              <ThSortable onClick={() => handleSort("history_modified_at")}>
                <div>
                  최종 수정일
                  {sort.field === "history_modified_at" &&
                    (sort.direction === "asc" ? (
                      <ArrowUpward />
                    ) : (
                      <ArrowDownward />
                    ))}
                </div>
              </ThSortable>
              <Th>작업</Th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item: Shareholder) => (
              <Tr key={item.id}>
                <Td>{item.name}</Td>
                <Td>{item.status}</Td>
                <Td>{item.stocks.toLocaleString()}</Td>
                <Td>{item.address}</Td>
                <Td>{getLatestModifier(item.id)}</Td>
                <Td>{getLatestModifiedDate(item.id)}</Td>
                <Td>
                  <ActionButton
                    className="edit"
                    onClick={() => setSelectedItem(item)}
                    title="수정">
                    <EditIcon />
                  </ActionButton>
                  <ActionButton
                    className="delete"
                    onClick={() => handleDelete(item.id)}
                    title="삭제">
                    <DeleteIcon />
                  </ActionButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      <PaginationContainer>
        <PaginationInfo>
          총 {filteredData.length}건 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1}
          -{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}건
        </PaginationInfo>
        <PaginationButtons>
          <PageButton
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}>
            처음
          </PageButton>
          <PageButton
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}>
            이전
          </PageButton>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (page) =>
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 2,
            )
            .map((page, index, array) =>
              index > 0 && array[index - 1] !== page - 1 ? (
                <span key={`ellipsis-${page}`}>...</span>
              ) : (
                <PageButton
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}>
                  {page}
                </PageButton>
              ),
            )}
          <PageButton
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}>
            다음
          </PageButton>
          <PageButton
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}>
            마지막
          </PageButton>
        </PaginationButtons>
      </PaginationContainer>

      {selectedItem && userId && (
        <EditShareholderModal
          data={selectedItem}
          userId={userId}
          onClose={handleModalClose}
        />
      )}
      {addModalOpen && (
        <AddShareholderModal
          listId={listId}
          onClose={() => setAddModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </Container>
  )
}
