import { useGetExcel } from "@/api/supabase"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import { Excel } from "@/types/excel"
import EditShareholderModal from "./EditShareholderModal"

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
`

const Th = styled.th`
  text-align: left;
  padding: 1rem;
  background: ${COLORS.gray[50]};
  color: ${COLORS.gray[600]};
  font-weight: 600;
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid ${COLORS.gray[100]};
  color: ${COLORS.gray[700]};
`

const Tr = styled.tr`
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: ${COLORS.gray[50]};
  }
`

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &.edit {
    color: ${COLORS.blue[600]};
    background: ${COLORS.blue[50]};

    &:hover {
      background: ${COLORS.blue[100]};
    }
  }

  &.delete {
    color: ${COLORS.red[600]};
    background: ${COLORS.red[50]};
    margin-left: 0.5rem;

    &:hover {
      background: ${COLORS.red[100]};
    }
  }
`

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
`

const PageButton = styled.button<{ isActive?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
  background: ${(props) =>
    props.isActive ? COLORS.blue[500] : COLORS.gray[50]};
  color: ${(props) => (props.isActive ? "white" : COLORS.gray[700])};

  &:hover {
    background: ${(props) =>
      props.isActive ? COLORS.blue[600] : COLORS.gray[100]};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.navigation {
    font-weight: 700;
  }
`

const ITEMS_PER_PAGE = 10

const FilterSection = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`

const SearchInput = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  width: 20rem;

  &:focus {
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  background: white;

  &:focus {
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

export default function ShareholderList() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selectedItem, setSelectedItem] = useState<Excel | null>(null)

  const { data: excelData, isLoading } = useGetExcel(14)

  if (isLoading) return <div>로딩 중...</div>
  if (!excelData) return null

  const filteredData = excelData.filter((item: Excel) => {
    const matchesSearch = item.company
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter ? item.status === statusFilter : true

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentData = filteredData.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  )

  return (
    <>
      <FilterSection>
        <SearchInput
          type="text"
          placeholder="회사명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <FilterSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">모든 상태</option>
          <option value="접수">접수</option>
          <option value="진행중">진행중</option>
          <option value="완료">완료</option>
        </FilterSelect>
      </FilterSection>

      <Table>
        <thead>
          <tr>
            <Th>회사명</Th>
            <Th>상태</Th>
            <Th>주식수</Th>
            <Th>메모</Th>
            <Th>작업</Th>
          </tr>
        </thead>
        <tbody>
          {currentData.map((item: Excel) => (
            <Tr key={item.id}>
              <Td>{item.company}</Td>
              <Td>{item.status}</Td>
              <Td>{item.stocks.toLocaleString()}</Td>
              <Td>{item.memo}</Td>
              <Td>
                <ActionButton className="edit">수정</ActionButton>
                <ActionButton
                  className="delete"
                  onClick={() => {
                    if (confirm("정말 삭제하시겠습니까?")) {
                      // TODO: 삭제 로직
                    }
                  }}>
                  삭제
                </ActionButton>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <PaginationContainer>
        <PageButton
          className="navigation"
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}>
          {"<<"}
        </PageButton>
        <PageButton
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}>
          {"<"}
        </PageButton>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (page) =>
              page === 1 ||
              page === totalPages ||
              Math.abs(page - currentPage) <= 2,
          )
          .map((page, index, array) => (
            <>
              {index > 0 && array[index - 1] !== page - 1 && (
                <span key={`ellipsis-${page}`}>...</span>
              )}
              <PageButton
                key={page}
                onClick={() => setCurrentPage(page)}
                isActive={currentPage === page}>
                {page}
              </PageButton>
            </>
          ))}

        <PageButton
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}>
          {">"}
        </PageButton>
        <PageButton
          className="navigation"
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}>
          {">>"}
        </PageButton>
      </PaginationContainer>

      {selectedItem && (
        <EditShareholderModal
          data={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  )
}
