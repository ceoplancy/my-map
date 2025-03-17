import { useGetExcel, useDeleteExcel } from "@/api/supabase"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import { Excel } from "@/types/excel"
import EditShareholderModal from "./EditShareholderModal"
import {
  ArrowUpward,
  ArrowDownward,
  FilterList,
  Search,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
} from "@mui/icons-material"
import { toast } from "react-toastify"

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

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  padding-right: 2.5rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  width: 100%;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: ${COLORS.gray[400]};
  }
`

type SortConfig = {
  field: keyof Excel | null
  direction: "asc" | "desc"
}

type Filters = {
  search: string
  status: string
  stocksMin: string
  stocksMax: string
}

export default function ShareholderList() {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<Excel | null>(null)
  const [sort, setSort] = useState<SortConfig>({
    field: null,
    direction: "asc",
  })
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    stocksMin: "",
    stocksMax: "",
  })

  const { data: excelData, isLoading, refetch } = useGetExcel(14)
  const deleteExcelMutation = useDeleteExcel()

  const handleModalClose = () => {
    setSelectedItem(null)
    refetch()
  }

  const handleSort = (field: keyof Excel) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setCurrentPage(1) // 필터 변경 시 첫 페이지로 이동
  }

  const handleDelete = async (id: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      try {
        await deleteExcelMutation.mutateAsync(id)
        toast.success("성공적으로 삭제되었습니다.")
      } catch (error) {
        console.error("삭제 중 오류 발생:", error)
        toast.error("삭제 중 오류가 발생했습니다.")
      }
    }
  }

  if (isLoading) return <div>로딩 중...</div>
  if (!excelData) return null

  // 필터링 로직
  const filteredData = excelData.filter((item: Excel) => {
    const searchTerm = filters.search.toLowerCase()
    const matchesSearch =
      searchTerm === "" ||
      item.company?.toLowerCase().includes(searchTerm) ||
      item.name?.toLowerCase().includes(searchTerm) ||
      item.maker?.toLowerCase().includes(searchTerm) ||
      item.memo?.toLowerCase().includes(searchTerm) ||
      item.address?.toLowerCase().includes(searchTerm) ||
      item.latlngaddress?.toLowerCase().includes(searchTerm)

    const matchesStatus =
      filters.status === "" || item.status === filters.status
    const matchesStocksMin = filters.stocksMin
      ? item.stocks >= parseInt(filters.stocksMin)
      : true
    const matchesStocksMax = filters.stocksMax
      ? item.stocks <= parseInt(filters.stocksMax)
      : true

    return (
      matchesSearch && matchesStatus && matchesStocksMin && matchesStocksMax
    )
  })

  // 정렬 로직
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sort.field) return 0

    const aValue = a[sort.field]
    const bValue = b[sort.field]

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0

    return sort.direction === "asc" ? comparison : -comparison
  })

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE)
  const currentData = sortedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  return (
    <Container>
      <FilterSection>
        <FilterHeader>
          <FilterTitle>
            <FilterList />
            주주명부 목록
          </FilterTitle>
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

          <ClearFiltersButton
            onClick={() => {
              setFilters({
                search: "",
                status: "",
                stocksMin: "",
                stocksMax: "",
              })
              setCurrentPage(1)
            }}>
            <ClearIcon />
            필터 초기화
          </ClearFiltersButton>
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
              <Th>작업</Th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item: Excel) => (
              <Tr key={item.id}>
                <Td>{item.name}</Td>
                <Td>{item.status}</Td>
                <Td>{item.stocks.toLocaleString()}</Td>
                <Td>{item.address}</Td>
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

      {selectedItem && (
        <EditShareholderModal data={selectedItem} onClose={handleModalClose} />
      )}
    </Container>
  )
}
