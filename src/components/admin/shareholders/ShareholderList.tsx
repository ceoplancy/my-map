import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import EditShareholderModal, {
  FIELD_LABELS as ChangeHistoryFieldLabels,
} from "./EditShareholderModal"
import AddShareholderModal from "./AddShareholderModal"
import ShareholderExportDialog from "./ShareholderExportDialog"
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
import { requireSupabaseRow } from "@/lib/supabaseMaybeSingle"
import type { Tables } from "@/types/db"
import {
  useShareholders,
  useDeleteShareholder,
  useChangesForList,
  useWorkspaceMembersWithUsers,
  type LatestChange,
  type ChangeEntry,
} from "@/api/workspace"
import { useSession } from "@/api/auth"
import GlobalSpinner from "@/components/ui/global-spinner"
import Select from "@/components/ui/select"
import {
  downloadShareholderRegistryWorkbook,
  type ShareholderRegistryExportOptions,
} from "@/lib/shareholderRegistryExportWorkbook"
import { getWorkspaceAdminBase, removeTags } from "@/lib/utils"
import supabase from "@/lib/supabase/supabaseClient"
import { useGetUsers } from "@/api/supabase"
import Link from "next/link"
import {
  PRIMARY_STATUS_OPTIONS,
  STATUS_DETAIL_OPTIONS,
  splitShareholderStatus,
  type PrimaryStatus,
} from "@/lib/shareholderStatus"

type Shareholder = Tables<"shareholders">

const EMPTY_CELL = "—"

/** 주주 목록 필터: 1차만 또는 1차+세부 */
function matchesShareholderStatusFilter(
  rawStatus: string | null | undefined,
  primary: "" | PrimaryStatus,
  detail: string,
): boolean {
  if (!primary) return true
  const parsed = splitShareholderStatus(rawStatus)
  if (parsed.primary !== primary) return false
  const detailTrim = detail.trim()
  if (!detailTrim) return true

  return parsed.detail === detailTrim
}

function formatModifiedAtDisplay(iso: string): string {
  if (!iso || iso === "-" || iso === EMPTY_CELL) return EMPTY_CELL
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(t))
}

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
  min-width: 0;

  @media (max-width: 600px) {
    border-radius: 0.75rem;
  }
`

const TableWrapper = styled.div`
  overflow-x: auto;
  margin: 1rem;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;

  @media (max-width: 600px) {
    margin: 0.5rem 0.5rem 0.75rem;
  }
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

  @media (max-width: 600px) {
    padding: 0.65rem 0.5rem;
    font-size: 0.8125rem;

    &:first-of-type {
      padding-left: 0.75rem;
    }

    &:last-of-type {
      padding-right: 0.75rem;
    }
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

  @media (max-width: 600px) {
    padding: 0.65rem 0.5rem;
    font-size: 0.8125rem;

    &:first-of-type {
      padding-left: 0.75rem;
    }

    &:last-of-type {
      padding-right: 0.75rem;
    }
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

  @media (max-width: 600px) {
    padding: 1rem 0.75rem;
  }
`

const FilterHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
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
  min-width: 0;

  @media (max-width: 768px) {
    max-width: none;
    width: 100%;
  }

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
  flex-wrap: wrap;
  gap: 0.75rem;

  @media (max-width: 600px) {
    padding: 0.75rem 1rem;
    flex-direction: column;
    align-items: stretch;
  }
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

const FilterWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const FilterGrid = styled.div`
  display: grid;
  /* 주식수·날짜는 가로 2칸이라 열 최소 폭이 너무 좁으면 넘치고 라벨·입력 정렬이 깨짐 */
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 1rem 1.25rem;
  align-items: start;

  @media (max-width: 480px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const FilterToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid ${COLORS.gray[100]};

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;

    & > button {
      justify-content: center;
    }
  }
`

const StocksRangeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
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
  min-width: 0;
`

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${COLORS.gray[700]};
`

const FilterSelect = styled(Select)`
  width: 100%;
  min-width: 0;
  &:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const ModifierSelect = styled(FilterSelect)`
  min-width: 12rem;
`

const FilterResultSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin: 0 1rem 0.75rem;
  padding: 0.65rem 0.85rem;
  background: linear-gradient(135deg, ${COLORS.gray[50]}, #fff);
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: ${COLORS.gray[800]};

  strong {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${COLORS.gray[900]};
  }

  @media (max-width: 600px) {
    margin: 0 0.5rem 0.75rem;
    font-size: 0.8125rem;
  }
`

const FieldHint = styled.span`
  display: block;
  font-size: 0.68rem;
  font-weight: 400;
  color: ${COLORS.gray[500]};
  line-height: 1.35;
  margin-top: -0.1rem;
`

type SortField = keyof Shareholder | "history_modifier" | "history_modified_at"

type SortConfig = {
  field: SortField | null
  direction: "asc" | "desc"
}

/** 테이블 헤더·필터 정렬 셀렉트 공통 옵션 */
const SHAREHOLDER_LIST_SORT_FIELD_OPTIONS: {
  value: SortField
  label: string
}[] = [
  { value: "name", label: "이름" },
  { value: "status", label: "상태" },
  { value: "stocks", label: "주식수" },
  { value: "address", label: "주소" },
  { value: "history_modifier", label: "최종 수정자" },
  { value: "history_modified_at", label: "최종 수정일" },
]

type Filters = {
  search: string

  /** 비어 있으면 업무 상태로 제한하지 않음 */
  statusPrimary: "" | PrimaryStatus

  /** 비어 있으면 1차만 매칭(세부 무관). 값이 있으면 해당 세부만 */
  statusDetail: string
  stocksMin: string
  stocksMax: string
  modifier: string

  /** YYYY-MM-DD, 변경 이력 없으면 shareholders.updated_at으로 비교 */
  modifiedFrom: string
  modifiedTo: string

  /** 사진 있음 / 없음 / 전체 */
  photo: "" | "with" | "without"

  /**
   * 주소→좌표 변환 성공·대기·실패. 빈 문자열이면 전체.
   * ok는 성공만 (DB null·빈 값은 성공으로 간주).
   */
  geocode: "" | "ok" | "pending" | "failed"
}

const DEFAULT_LIST_FILTERS: Filters = {
  search: "",
  statusPrimary: "",
  statusDetail: "",
  stocksMin: "",
  stocksMax: "",
  modifier: "",
  modifiedFrom: "",
  modifiedTo: "",
  photo: "",
  geocode: "",
}

function describeShareholderListFilters(filters: Filters): string {
  const parts: string[] = []
  if (filters.search.trim()) {
    parts.push(`검색「${filters.search.trim()}」`)
  }
  if (filters.statusPrimary) {
    if (filters.statusDetail.trim()) {
      parts.push(
        `업무 ${filters.statusPrimary} · ${filters.statusDetail.trim()}`,
      )
    } else {
      parts.push(`업무 1차 ${filters.statusPrimary}`)
    }
  }
  if (filters.stocksMin.trim() || filters.stocksMax.trim()) {
    parts.push(
      `주식수 ${filters.stocksMin.trim() || "—"} ~ ${filters.stocksMax.trim() || "—"}`,
    )
  }
  if (filters.modifier) {
    parts.push("최종수정자 필터 적용")
  }
  if (filters.modifiedFrom.trim() || filters.modifiedTo.trim()) {
    parts.push(
      `최종수정일 ${filters.modifiedFrom.trim() || "—"} ~ ${filters.modifiedTo.trim() || "—"}`,
    )
  }
  if (filters.photo === "with") parts.push("사진 있음")
  if (filters.photo === "without") parts.push("사진 없음")
  if (filters.geocode === "") {
    parts.push("주소 변환 전체(성공·대기·실패)")
  } else if (filters.geocode === "pending") {
    parts.push("주소 변환 대기만")
  } else if (filters.geocode === "failed") {
    parts.push("주소 변환 실패만")
  }
  // ok(성공만)은 사용자가 명시적으로 선택했을 때만 문구 추가
  if (filters.geocode === "ok") {
    parts.push("주소 변환 성공만")
  }

  return parts.length > 0 ? parts.join(" · ") : "없음 (전체)"
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
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [sort, setSort] = useState<SortConfig>({
    field: null,
    direction: "asc",
  })
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_LIST_FILTERS })

  const { data: session } = useSession()
  const userId = session?.user?.id ?? ""
  const {
    data: shareholdersData,
    isPending: shareholdersPending,
    refetch,
  } = useShareholders({
    listId,
    photoFilter:
      filters.photo === "with"
        ? "with"
        : filters.photo === "without"
          ? "without"
          : undefined,
    geocodeStatusFilter: filters.geocode === "" ? undefined : [filters.geocode],
  })

  const { data: listMeta } = useQuery({
    queryKey: ["shareholderListWorkspace", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shareholder_lists")
        .select(
          "workspace_id, contact_phone, contact_note, rules_version, archived_at, completed_at, name",
        )
        .eq("id", listId)
        .maybeSingle()
      if (error) throw error

      return requireSupabaseRow(
        data,
        "주주명부를 불러올 수 없습니다. 권한을 확인하거나 다시 로그인해 주세요.",
      )
    },
    enabled: !!listId,
  })
  const workspaceId = listMeta?.workspace_id ?? null

  const { data: workspaceMembers } = useWorkspaceMembersWithUsers(workspaceId)
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

  /** 표시명: 워크스페이스 멤버 우선, 없으면 플랫폼 사용자 목록(보조) */
  const usersMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const mem of workspaceMembers ?? []) {
      m[mem.user_id] = mem.name?.trim() || mem.email || mem.user_id
    }
    for (const u of usersData?.users ?? []) {
      if (!m[u.id]) {
        const name = u.user_metadata?.name
        m[u.id] =
          (typeof name === "string" ? name.trim() : "") || u.email || u.id
      }
    }

    return m
  }, [workspaceMembers, usersData])

  /** 최종 수정자 필터 옵션 = 명부에 실제로 등장하는 latest changed_by 만 (열과 동일 기준) */
  const latestModifierIds = useMemo(() => {
    const ids = new Set<string>()
    for (const sid of Object.keys(latestChanges)) {
      const uid = latestChanges[sid]?.changed_by
      if (uid) ids.add(uid)
    }

    return [...ids].sort((a, b) =>
      (usersMap[a] ?? a).localeCompare(usersMap[b] ?? b, "ko"),
    )
  }, [latestChanges, usersMap])

  useEffect(() => {
    if (!filters.modifier) return
    if (changesData === undefined) return
    if (latestModifierIds.length === 0) {
      setFilters((prev) => ({ ...prev, modifier: "" }))

      return
    }
    if (!latestModifierIds.includes(filters.modifier)) {
      setFilters((prev) => ({ ...prev, modifier: "" }))
    }
  }, [filters.modifier, latestModifierIds, changesData])

  const getLatestModifier = useCallback(
    (shareholderId: string) => {
      const entry = latestChanges[shareholderId]
      if (!entry) return EMPTY_CELL

      return usersMap[entry.changed_by] ?? entry.changed_by
    },
    [latestChanges, usersMap],
  )

  const getLatestModifiedDate = useCallback(
    (shareholderId: string) => {
      const entry = latestChanges[shareholderId]
      if (!entry) return EMPTY_CELL

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

  const handleSortFieldSelect = (value: string) => {
    if (value === "") {
      setSort((prev) => ({ ...prev, field: null }))

      return
    }
    setSort((prev) => ({ ...prev, field: value as SortField }))
  }

  const handleSortDirectionSelect = (value: "asc" | "desc") => {
    setSort((prev) => ({ ...prev, direction: value }))
  }

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setCurrentPage(1)
  }

  const handleStatusPrimaryFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      statusPrimary: value as Filters["statusPrimary"],
      statusDetail: "",
    }))
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
        (item.phone ?? "").toLowerCase().includes(searchTerm) ||
        memoPlain.includes(searchTerm) ||
        item.address?.toLowerCase().includes(searchTerm) ||
        item.address_original?.toLowerCase().includes(searchTerm) ||
        item.latlngaddress?.toLowerCase().includes(searchTerm)

      const matchesStatus = matchesShareholderStatusFilter(
        item.status,
        filters.statusPrimary,
        filters.statusDetail,
      )

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

      /** 최종 수정자 열과 동일: shareholder_change_history 의 "최신 1건" changed_by 만 비교 */
      const matchesModifier =
        filters.modifier === "" ||
        latestChanges[item.id]?.changed_by === filters.modifier

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
  }, [shareholdersData, filters, latestChanges, getComparableModifiedTimeMs])

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (!sort.field) return 0

      if (sort.field === "history_modifier") {
        const aModifier = getLatestModifier(a.id)
        const bModifier = getLatestModifier(b.id)

        if (aModifier === EMPTY_CELL && bModifier !== EMPTY_CELL) return 1
        if (bModifier === EMPTY_CELL && aModifier !== EMPTY_CELL) return -1
        if (aModifier === EMPTY_CELL && bModifier === EMPTY_CELL) return 0

        const comparison =
          aModifier < bModifier ? -1 : aModifier > bModifier ? 1 : 0

        return sort.direction === "asc" ? comparison : -comparison
      }

      if (sort.field === "history_modified_at") {
        const aDate = getLatestModifiedDate(a.id)
        const bDate = getLatestModifiedDate(b.id)

        if (aDate === EMPTY_CELL && bDate !== EMPTY_CELL) return 1
        if (bDate === EMPTY_CELL && aDate !== EMPTY_CELL) return -1
        if (aDate === EMPTY_CELL && bDate === EMPTY_CELL) return 0

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

  const listTotals = useMemo(() => {
    let totalStocks = 0
    for (const r of sortedData) {
      totalStocks += Number(r.stocks) || 0
    }

    return { count: sortedData.length, totalStocks }
  }, [sortedData])

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

  const formatHistoryForExport = useCallback(
    (shareholderId: string): string => {
      const entries = allChanges[shareholderId]
      if (!entries?.length) return ""

      return entries
        .map((e) => {
          const who = usersMap[e.changed_by] ?? e.changed_by
          const label = ChangeHistoryFieldLabels[e.field] ?? e.field

          return `[${e.changed_at}] ${who}: ${label} ${e.old_value ?? "-"} → ${e.new_value ?? "-"}`
        })
        .join("\n")
    },
    [allChanges, usersMap],
  )

  const runRegistryExport = useCallback(
    (opts: ShareholderRegistryExportOptions) => {
      const filterDescription = describeShareholderListFilters(filters)
      const displayName = listMeta?.name ?? listName ?? null
      const fileBase = displayName ? `주주명부_${displayName}` : "주주명부"
      const noFilterApplied =
        filters.search.trim() === "" &&
        !filters.statusPrimary &&
        filters.statusDetail.trim() === "" &&
        filters.stocksMin.trim() === "" &&
        filters.stocksMax.trim() === "" &&
        filters.modifier === "" &&
        filters.modifiedFrom.trim() === "" &&
        filters.modifiedTo.trim() === "" &&
        filters.photo === "" &&
        filters.geocode === ""
      const rowsForExport = noFilterApplied
        ? (shareholdersData ?? [])
        : sortedData
      const exportOptions: ShareholderRegistryExportOptions = noFilterApplied
        ? {
            ...opts,
            includeSummarySheet: false,
            splitSheetsByPrimaryStatus: true,
          }
        : opts

      downloadShareholderRegistryWorkbook({
        listName: displayName,
        filterDescription,
        rows: rowsForExport,
        options: exportOptions,
        fileBaseName: fileBase,
        ctx: {
          formatHistoryInline: formatHistoryForExport,
          getLatestModifier: (id) => String(getLatestModifier(id)),
          getLatestModifiedDate: (id) => {
            const raw = getLatestModifiedDate(id)

            return formatModifiedAtDisplay(raw === EMPTY_CELL ? "" : raw)
          },
          allChanges,
          usersMap,
          fieldLabels: ChangeHistoryFieldLabels,
        },
      })
      toast.success("엑셀 파일을 저장했습니다.")
    },
    [
      filters,
      listMeta?.name,
      listName,
      shareholdersData,
      sortedData,
      formatHistoryForExport,
      getLatestModifier,
      getLatestModifiedDate,
      allChanges,
      usersMap,
    ],
  )

  if (shareholdersPending && shareholdersData === undefined) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
      </div>
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
              flexWrap: "wrap",
            }}>
            <FilterTitle>
              <FilterList />
              주주 목록
            </FilterTitle>
            {listMeta?.contact_phone || listMeta?.contact_note ? (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: COLORS.gray[600],
                  maxWidth: "28rem",
                }}>
                명부 연락처: {listMeta.contact_phone ?? "—"}
                {listMeta.contact_note ? ` · ${listMeta.contact_note}` : ""}
              </span>
            ) : null}
            {workspaceId ? (
              <Link
                href={`${getWorkspaceAdminBase(workspaceId)}/excel-import?listId=${listId}`}
                style={{
                  fontSize: "0.8rem",
                  color: COLORS.blue[600],
                  fontWeight: 600,
                }}>
                엑셀 가져오기 · 보류함
              </Link>
            ) : null}
            <AddButton type="button" onClick={() => setAddModalOpen(true)}>
              <AddIcon />
              주주 추가
            </AddButton>
          </div>
          <SearchInputWrapper>
            <Search />
            <SearchInput
              placeholder="이름, 회사명, 주소, 원문 주소, 메모로 검색..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </SearchInputWrapper>
        </FilterHeader>
        <FilterWrap>
          <FilterGrid>
            <FormGroup>
              <Label title="1차 유형만 고르거나, 아래에서 세부까지 좁힐 수 있습니다.">
                업무 상태
                <FieldHint>
                  1차 유형 · 필요 시 2차 세부까지 (2차는 선택)
                </FieldHint>
              </Label>
              <FilterSelect
                value={filters.statusPrimary}
                onChange={(e) =>
                  handleStatusPrimaryFilterChange(e.target.value)
                }
                aria-label="업무 상태 1차">
                <option value="">전체</option>
                {PRIMARY_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                style={{ marginTop: "0.5rem" }}
                value={filters.statusDetail}
                disabled={!filters.statusPrimary}
                onChange={(e) =>
                  handleFilterChange("statusDetail", e.target.value)
                }
                aria-label="업무 상태 2차 세부">
                <option value="">전체 (1차만 적용)</option>
                {(filters.statusPrimary
                  ? STATUS_DETAIL_OPTIONS[filters.statusPrimary]
                  : []
                ).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </FilterSelect>
            </FormGroup>

            <FormGroup>
              <Label title="주소를 좌표로 바꾼 뒤 지도에 쓸 수 있는지에 대한 성공·대기·실패 구분입니다.">
                주소 변환
                <FieldHint>
                  성공·대기·실패 기준 · 저장값 없음·null은 성공으로 봄 · 기본
                  전체
                </FieldHint>
              </Label>
              <FilterSelect
                value={filters.geocode}
                onChange={(e) =>
                  handleFilterChange(
                    "geocode",
                    e.target.value as Filters["geocode"],
                  )
                }
                title="지오코딩: 주소 변환의 성공·대기·실패. 비어 있거나 null은 성공(ok)으로 간주합니다.">
                <option value="">전체</option>
                <option value="ok">성공</option>
                <option value="pending">대기</option>
                <option value="failed">실패</option>
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
              <Label>최종 수정자</Label>
              <ModifierSelect
                value={filters.modifier}
                onChange={(e) => handleFilterChange("modifier", e.target.value)}
                title="표시 열과 동일: 변경 이력 기준 최신 수정자만">
                <option value="">모든 최종 수정자</option>
                {latestModifierIds.map((uid) => (
                  <option key={uid} value={uid}>
                    {usersMap[uid] ?? uid}
                  </option>
                ))}
              </ModifierSelect>
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

            <FormGroup>
              <Label>사진</Label>
              <FilterSelect
                value={filters.photo}
                onChange={(e) =>
                  handleFilterChange(
                    "photo",
                    e.target.value as Filters["photo"],
                  )
                }>
                <option value="">전체</option>
                <option value="with">있음</option>
                <option value="without">없음</option>
              </FilterSelect>
            </FormGroup>

            <FormGroup>
              <Label>정렬 기준</Label>
              <FilterSelect
                value={sort.field ?? ""}
                onChange={(e) => handleSortFieldSelect(e.target.value)}>
                <option value="">기본 (정렬 없음)</option>
                {SHAREHOLDER_LIST_SORT_FIELD_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
            </FormGroup>

            <FormGroup>
              <Label>정렬 순서</Label>
              <FilterSelect
                value={sort.direction}
                disabled={!sort.field}
                onChange={(e) =>
                  handleSortDirectionSelect(e.target.value as "asc" | "desc")
                }>
                <option value="asc">오름차순</option>
                <option value="desc">내림차순</option>
              </FilterSelect>
            </FormGroup>
          </FilterGrid>

          <FilterToolbar>
            <ClearFiltersButton
              type="button"
              onClick={() => {
                setFilters({ ...DEFAULT_LIST_FILTERS })
                setCurrentPage(1)
              }}>
              <ClearIcon />
              필터 초기화
            </ClearFiltersButton>

            <ExportButton
              type="button"
              onClick={() => setExportDialogOpen(true)}>
              <DownloadIcon />
              엑셀 내보내기
            </ExportButton>
          </FilterToolbar>
        </FilterWrap>
      </FilterSection>

      <FilterResultSummary role="status" aria-live="polite">
        현재 조건&nbsp;
        <strong>{listTotals.count.toLocaleString()}명</strong>
        &nbsp;· 합계 주식수&nbsp;
        <strong>{listTotals.totalStocks.toLocaleString()}주</strong>
      </FilterResultSummary>

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
              <Th>사진</Th>
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
                <Td>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "cover",
                        borderRadius: 6,
                      }}
                    />
                  ) : (
                    EMPTY_CELL
                  )}
                </Td>
                <Td>{item.status}</Td>
                <Td>{item.stocks.toLocaleString()}</Td>
                <Td>{item.address}</Td>
                <Td>{getLatestModifier(item.id)}</Td>
                <Td>
                  {formatModifiedAtDisplay(getLatestModifiedDate(item.id))}
                </Td>
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
      <ShareholderExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onConfirm={runRegistryExport}
        filterDescriptionPreview={describeShareholderListFilters(filters)}
        rowCount={sortedData.length}
      />
    </Container>
  )
}
