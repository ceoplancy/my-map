import Link from "next/link"
import { useGetUserData } from "@/api/auth"
import { FullPageLoader } from "@/components/FullPageLoader"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { toast } from "react-toastify"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { useCurrentWorkspace } from "@/store/workspaceState"
import ShareholderExportDialog from "@/components/admin/shareholders/ShareholderExportDialog"
import { FIELD_LABELS } from "@/components/admin/shareholders/EditShareholderModal"
import {
  downloadShareholderRegistryWorkbook,
  type ShareholderRegistryExportOptions,
} from "@/lib/shareholderRegistryExportWorkbook"
import { getWorkspaceAdminBase } from "@/lib/utils"
import {
  useShareholderLists,
  useShareholders,
  useShareholdersMakerSummaryRows,
  useWorkspaceChangeHistorySummary,
  useWorkspaceMembersWithUsers,
  type WorkspaceMemberWithUser,
} from "@/api/workspace"
import { type Tables, type WorkspaceRole } from "@/types/db"
import {
  getPrimaryStatusCategory,
  PRIMARY_STATUS_OPTIONS,
  splitShareholderStatus,
  type PrimaryStatus,
} from "@/lib/shareholderStatus"
import GlobalSpinner from "@/components/ui/global-spinner"
import { WORKSPACE_ROLE_LABELS } from "@/constants/roles"
import Select from "@/components/ui/select"
import { QrCode2 } from "@mui/icons-material"

const WelcomeSection = styled.div`
  background: linear-gradient(135deg, white, #f8fafc);
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 2rem;
  margin-bottom: 2rem;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`

const WelcomeTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1f2937, #4b5563);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.75rem;
`

const WelcomeText = styled.p`
  color: #4b5563;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 2rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const StatCard = styled.div<{ variant: "blue" | "green" | "purple" }>`
  background: ${(props) => {
    switch (props.variant) {
      case "blue":
        return `linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]})`
      case "green":
        return `linear-gradient(135deg, ${COLORS.green[500]}, ${COLORS.green[600]})`
      case "purple":
        return `linear-gradient(135deg, ${COLORS.purple[500]}, ${COLORS.purple[600]})`
      default:
        return `linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]})`
    }
  }};
  color: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
`

const StatTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`

const StatValue = styled.p`
  font-size: 1.875rem;
  font-weight: 700;
`

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const ContentCard = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;

  &:hover {
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`

const CardTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
`

const ViewAllLink = styled(Link)`
  color: ${COLORS.blue[500]};
  font-size: 0.875rem;
  &:hover {
    color: ${COLORS.blue[600]};
  }
`

const UserItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  transition: all 0.2s ease;
  border-radius: 0.75rem;

  &:hover {
    background-color: #f8fafc;
    transform: translateX(4px);
  }
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const UserAvatar = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #e5e7eb, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`

const UserEmail = styled.p`
  font-weight: 500;
  color: #1f2937;
`

const UserDate = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
`

const UserRole = styled.span<{ isAdmin: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  background: ${(props) =>
    props.isAdmin
      ? "linear-gradient(135deg, #ddd6fe, #c4b5fd)"
      : "linear-gradient(135deg, #f3f4f6, #e5e7eb)"};
  color: ${(props) => (props.isAdmin ? "#6d28d9" : "#374151")};
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`

const ActionButton = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f9fafb, #f3f4f6);
  border-radius: 1rem;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
`

const ActionIcon = styled.svg`
  width: 2rem;
  height: 2rem;
  color: #4b5563;
  margin-bottom: 0.5rem;
`

const ActionText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`

const SettingsButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f3f4f6;
  }
`

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const UserAvatarText = styled.span`
  color: #4b5563; // text-gray-600
  font-weight: 500; // font-medium
`

const ListDashboardSection = styled.div`
  margin-bottom: 2rem;
`

const ListDashboardGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  align-items: start;

  @media (min-width: 1180px) {
    grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr);
  }
`

const ListSelectRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`

const ListSelectLabel = styled.label`
  font-weight: 600;
  color: ${COLORS.gray[700]};
`

const ListSelect = styled(Select)`
  min-width: 200px;
`

const StatusCountGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
`

const DetailBreakdownBlock = styled.div`
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid ${COLORS.gray[100]};
`

const DetailBreakdownTitle = styled.h3`
  margin: 0 0 0.35rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: ${COLORS.gray[800]};
`

const DetailBreakdownHint = styled.p`
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  color: ${COLORS.gray[500]};
  line-height: 1.45;
`

const DetailTableScroll = styled.div`
  max-height: min(28rem, 50vh);
  overflow: auto;
  border: 1px solid ${COLORS.gray[100]};
  border-radius: 0.65rem;
  -webkit-overflow-scrolling: touch;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
`

const DetailTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;

  tbody tr:nth-of-type(odd) {
    background: ${COLORS.gray[50]};
  }

  tbody tr:hover td {
    background: ${COLORS.gray[100]};
  }
`

const DetailTh = styled.th`
  text-align: left;
  padding: 0.5rem 0.65rem;
  background: ${COLORS.gray[50]};
  color: ${COLORS.gray[600]};
  font-weight: 600;
  border-bottom: 1px solid ${COLORS.gray[100]};
  position: sticky;
  top: 0;
  z-index: 1;
`

const DetailTd = styled.td`
  padding: 0.45rem 0.65rem;
  border-bottom: 1px solid ${COLORS.gray[50]};
  color: ${COLORS.gray[800]};
  vertical-align: top;
`

const DetailTdNum = styled(DetailTd)`
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const PrimaryPill = styled.span<{ $bg: string }>`
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
  background: ${(p) => p.$bg};
  white-space: nowrap;
`

const DetailTfoot = styled.tfoot`
  font-weight: 700;
  color: ${COLORS.gray[900]};
  background: ${COLORS.gray[100]};
`

const DetailThFoot = styled.th`
  text-align: left;
  padding: 0.5rem 0.65rem;
  border-top: 2px solid ${COLORS.gray[200]};
  font-size: 0.75rem;
`

const DetailTdFoot = styled.td`
  padding: 0.5rem 0.65rem;
  border-top: 2px solid ${COLORS.gray[200]};
  font-size: 0.75rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
`

const CompanyStatusCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 15rem;
`

const CompanyStatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
`

const CompanyStatusName = styled.span`
  font-weight: 700;
  color: ${COLORS.gray[800]};
`

const CompanyStatusChip = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.12rem 0.4rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${(p) => p.$color};
  background: color-mix(in srgb, ${(p) => p.$color} 14%, white);
  border: 1px solid color-mix(in srgb, ${(p) => p.$color} 28%, white);
`

const CompanyStatusEmpty = styled.span`
  font-size: 0.75rem;
  color: ${COLORS.gray[500]};
`

const ScopeFilterSection = styled.div`
  margin-top: 1.5rem;
  padding: 1rem 1rem 1.125rem;
  border-radius: 0.75rem;
  border: 1px solid ${COLORS.gray[200]};
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 45%);
`

const ScopeFilterSectionTitle = styled.div`
  font-size: 0.8125rem;
  font-weight: 800;
  color: ${COLORS.gray[800]};
  margin-bottom: 0.25rem;
`

const ScopeFilterSectionHint = styled.p`
  margin: 0 0 1rem;
  font-size: 0.75rem;
  color: ${COLORS.gray[500]};
  line-height: 1.45;
`

const ScopeFilterPanels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: stretch;
`

const ScopeFilterPanel = styled.div`
  flex: 1 1 220px;
  min-width: 0;
  padding: 0.75rem 0.85rem;
  border-radius: 0.5rem;
  border: 1px solid ${COLORS.gray[100]};
  background: #fff;
`

const ScopeFilterPanelTitle = styled.div`
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: ${COLORS.gray[500]};
  margin-bottom: 0.5rem;
`

const ExportToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed ${COLORS.gray[200]};
`

const StatusCountCard = styled.div<{ color: string }>`
  padding: 1rem;
  border-radius: 0.75rem;
  background: ${(p) => p.color};
  color: white;
  text-align: center;
`

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1rem;
`

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const FilterInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  min-width: 120px;
`

const ExportButton = styled.button`
  padding: 0.75rem 1.25rem;
  background: ${COLORS.green[500]};
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${COLORS.green[600]};
  }
`

function makerMatchesFieldAgent(
  maker: string | null,
  agent: WorkspaceMemberWithUser,
): boolean {
  const m = (maker ?? "").trim()
  if (!m) return false
  const keys = [agent.name, agent.email, agent.user_id]
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0)

  return keys.some((k) => k === m)
}

/** 멤버에 배정된 명부만; 배정이 비어 있으면 워크스페이스 명부 전체(지도와 동일 취지) */
function listIdsInScopeForFieldAgent(
  agent: WorkspaceMemberWithUser,
  allLists: { id: string }[],
): string[] {
  const allIds = allLists.map((l) => l.id)
  const allowed = agent.allowed_list_ids
  if (Array.isArray(allowed) && allowed.length > 0) {
    return allowed.filter((id) => allIds.includes(id))
  }

  return allIds
}

function buildDashboardExportFilterDescription(input: {
  listName: string
  filterPrimary: PrimaryStatus[]
  filterCompany: string
  filterMaker: string
}): string {
  const bits: string[] = []
  const ln = input.listName.trim()
  bits.push(ln ? `명부: ${ln}` : "명부: —")

  const extras: string[] = []
  if (input.filterPrimary.length) {
    extras.push(`1차 상태: ${input.filterPrimary.join(", ")}`)
  }
  if (input.filterCompany.trim()) {
    extras.push(`회사: ${input.filterCompany.trim()}`)
  }
  if (input.filterMaker.trim()) {
    extras.push(`담당: ${input.filterMaker.trim()}`)
  }
  if (extras.length === 0) {
    bits.push("범위: 명부 전체")
  } else {
    bits.push(...extras)
  }
  bits.push("출처: 워크스페이스 관리 대시보드")

  return bits.join(" · ")
}

/** 워크스페이스 대시보드 본문 (useCurrentWorkspace 기준). /admin 또는 /workspaces/[id]/admin 에서 사용 */
export function WorkspaceDashboardBody() {
  const { data: user } = useGetUserData()
  const [workspace] = useCurrentWorkspace()
  const { data: workspaceMembersWithUsers = [] } = useWorkspaceMembersWithUsers(
    workspace?.id ?? null,
  )
  const { data: lists = [] } = useShareholderLists(workspace?.id ?? null)
  const [selectedListId, setSelectedListId] = useState<string>("")
  const [filterPrimary, setFilterPrimary] = useState<PrimaryStatus[]>([])
  const [filterCompany, setFilterCompany] = useState("")
  const [filterMaker, setFilterMaker] = useState("")
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const effectiveListId = (selectedListId || lists[0]?.id) ?? null
  const effectiveListName =
    effectiveListId != null
      ? (lists.find((l) => l.id === effectiveListId)?.name ?? "")
      : ""
  const { data: shareholders = [] } = useShareholders({
    listId: effectiveListId,
    statusPrimaryFilter: filterPrimary.length > 0 ? filterPrimary : undefined,
    company: filterCompany.trim() ? [filterCompany.trim()] : undefined,
    maker: filterMaker.trim() || undefined,
  })

  const { byPrimary, totalStocks } = useMemo(() => {
    const byPrimary: Record<PrimaryStatus, number> = {
      미방문: 0,
      완료: 0,
      보류: 0,
      실패: 0,
      전자투표: 0,
      주주총회: 0,
    }
    let totalStocks = 0
    for (const s of shareholders as Tables<"shareholders">[]) {
      const p = getPrimaryStatusCategory(s.status)
      byPrimary[p] += 1
      totalStocks += s.stocks ?? 0
    }

    return { byPrimary, totalStocks }
  }, [shareholders])

  const detailBreakdownRows = useMemo(() => {
    type Row = {
      primary: PrimaryStatus
      detail: string
      count: number
      stocks: number
    }
    const map = new Map<string, Row>()
    for (const s of shareholders as Tables<"shareholders">[]) {
      const { primary, detail } = splitShareholderStatus(s.status)
      const key = `${primary}\t${detail}`
      const prev = map.get(key) ?? {
        primary,
        detail,
        count: 0,
        stocks: 0,
      }
      prev.count += 1
      prev.stocks += s.stocks ?? 0
      map.set(key, prev)
    }

    return [...map.values()].sort((a, b) => {
      const pa = PRIMARY_STATUS_OPTIONS.indexOf(a.primary)
      const pb = PRIMARY_STATUS_OPTIONS.indexOf(b.primary)
      if (pa !== pb) return pa - pb

      return a.detail.localeCompare(b.detail, "ko")
    })
  }, [shareholders])

  const detailTotals = useMemo(() => {
    return detailBreakdownRows.reduce(
      (acc, r) => ({
        count: acc.count + r.count,
        stocks: acc.stocks + r.stocks,
      }),
      { count: 0, stocks: 0 },
    )
  }, [detailBreakdownRows])

  const dashboardExportFilterPreview = useMemo(
    () =>
      buildDashboardExportFilterDescription({
        listName: effectiveListName,
        filterPrimary,
        filterCompany,
        filterMaker,
      }),
    [effectiveListName, filterPrimary, filterCompany, filterMaker],
  )

  const workspaceListIds = useMemo(() => lists.map((l) => l.id), [lists])
  const { data: makerSummaryRows = [], isLoading: makerSummaryLoading } =
    useShareholdersMakerSummaryRows(workspaceListIds)
  const {
    data: changeHistorySummary = { byUserId: {} },
    isLoading: changeHistorySummaryLoading,
  } = useWorkspaceChangeHistorySummary(workspaceListIds)

  const fieldAgentProjectRows = useMemo(() => {
    type Row = {
      userId: string
      agentLabel: string
      listId: string
      listName: string
      assignedCount: number
      completedCount: number
      totalStocks: number
    }
    const out: Row[] = []
    const agents = workspaceMembersWithUsers.filter(
      (m) => m.role === "field_agent",
    )
    const listNameOf = (id: string) =>
      lists.find((l) => l.id === id)?.name?.trim() || "이름 없는 명부"

    for (const agent of agents) {
      const agentLabel =
        agent.name?.trim() || agent.email?.trim() || agent.user_id
      const scope = listIdsInScopeForFieldAgent(agent, lists)
      for (const listId of scope) {
        let assignedCount = 0
        let completedCount = 0
        let totalStocks = 0
        for (const r of makerSummaryRows) {
          if (r.list_id !== listId) continue
          if (!makerMatchesFieldAgent(r.maker, agent)) continue
          assignedCount += 1
          totalStocks += Number(r.stocks ?? 0)
          if (getPrimaryStatusCategory(r.status) === "완료") {
            completedCount += 1
          }
        }
        if (assignedCount > 0) {
          out.push({
            userId: agent.user_id,
            agentLabel,
            listId,
            listName: listNameOf(listId),
            assignedCount,
            completedCount,
            totalStocks,
          })
        }
      }
    }
    out.sort((a, b) => {
      const c = a.agentLabel.localeCompare(b.agentLabel, "ko")
      if (c !== 0) return c

      return a.listName.localeCompare(b.listName, "ko")
    })

    return out
  }, [workspaceMembersWithUsers, lists, makerSummaryRows])

  const fieldAgentWorkRows = useMemo(() => {
    type CompanyPrimaryCount = {
      company: string
      counts: Record<PrimaryStatus, number>
    }
    type AgentWorkRow = {
      userId: string
      agentLabel: string
      assignedCount: number
      changeCount: number
      memoCount: number
      companyPrimary: CompanyPrimaryCount[]
    }
    const agents = workspaceMembersWithUsers.filter(
      (m) => m.role === "field_agent",
    )
    const rows: AgentWorkRow[] = []

    for (const agent of agents) {
      const scope = new Set(listIdsInScopeForFieldAgent(agent, lists))
      const companyMap = new Map<string, Record<PrimaryStatus, number>>()
      let assignedCount = 0
      for (const r of makerSummaryRows) {
        if (!scope.has(r.list_id)) continue
        if (!makerMatchesFieldAgent(r.maker, agent)) continue
        assignedCount += 1
        const company = r.company?.trim() || "회사 미지정"
        const p = getPrimaryStatusCategory(r.status)
        const prev = companyMap.get(company) ?? {
          미방문: 0,
          완료: 0,
          보류: 0,
          실패: 0,
          전자투표: 0,
          주주총회: 0,
        }
        prev[p] += 1
        companyMap.set(company, prev)
      }
      const agentLabel =
        agent.name?.trim() || agent.email?.trim() || agent.user_id
      const changeBy = changeHistorySummary.byUserId[agent.user_id] ?? {
        changeCount: 0,
        memoCount: 0,
      }
      rows.push({
        userId: agent.user_id,
        agentLabel,
        assignedCount,
        changeCount: changeBy.changeCount,
        memoCount: changeBy.memoCount,
        companyPrimary: [...companyMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], "ko"))
          .map(([company, counts]) => ({ company, counts })),
      })
    }

    rows.sort((a, b) => a.agentLabel.localeCompare(b.agentLabel, "ko"))

    return rows
  }, [workspaceMembersWithUsers, lists, makerSummaryRows, changeHistorySummary])

  const statusCardColor = (p: PrimaryStatus): string => {
    switch (p) {
      case "미방문":
        return COLORS.gray[500]
      case "완료":
        return COLORS.green[500]
      case "보류":
        return COLORS.yellow[500]
      case "실패":
        return COLORS.red[500]
      case "전자투표":
        return COLORS.purple[500]
      case "주주총회":
        return COLORS.purple[700]
    }
  }

  const runDashboardExport = useCallback(
    (opts: ShareholderRegistryExportOptions) => {
      if (shareholders.length === 0) {
        toast.info("보낼 데이터가 없습니다.")

        return
      }
      const base =
        effectiveListName.trim().length > 0
          ? `대시보드_${effectiveListName.trim()}`
          : "대시보드_주주명부"

      downloadShareholderRegistryWorkbook({
        listName: effectiveListName.trim() || null,
        filterDescription: buildDashboardExportFilterDescription({
          listName: effectiveListName,
          filterPrimary,
          filterCompany,
          filterMaker,
        }),
        rows: shareholders as Tables<"shareholders">[],
        options: opts,
        fileBaseName: base,
        ctx: {
          formatHistoryInline: () => "",
          getLatestModifier: () => "",
          getLatestModifiedDate: () => "",
          allChanges: {},
          usersMap: {},
          fieldLabels: FIELD_LABELS,
        },
      })
      toast.success("엑셀 파일을 저장했습니다.")
    },
    [
      shareholders,
      effectiveListName,
      filterPrimary,
      filterCompany,
      filterMaker,
    ],
  )

  // /admin 은 워크스페이스 전용 대시보드. 통합(플랫폼) 현황은 /admin/integrated
  const memberCount = workspaceMembersWithUsers.length
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const newMembersThisMonth = workspaceMembersWithUsers.filter((m) => {
    const d = new Date(m.created_at)

    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }).length
  const adminRoleCount = workspaceMembersWithUsers.filter((m) =>
    ["service_admin", "top_admin", "admin"].includes(m.role),
  ).length
  const recentMembers = [...workspaceMembersWithUsers]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5)

  if (!workspace) return null

  const workspaceAdminBase = getWorkspaceAdminBase(workspace.id)

  return (
    <>
      <WelcomeSection>
        <WelcomeTitle>
          안녕하세요,{" "}
          {user?.user?.user_metadata?.name ?? user?.user?.email ?? ""}님 👋
        </WelcomeTitle>
        <WelcomeText>
          이 워크스페이스의 현황을 확인하고 주주명부·멤버를 관리할 수 있습니다.
        </WelcomeText>
      </WelcomeSection>

      {lists.length > 0 && (
        <ListDashboardSection>
          <ListDashboardGrid>
            <ContentCard>
              <CardHeader>
                <CardTitle>주주명부 현황</CardTitle>
              </CardHeader>
              <ListSelectRow>
                <ListSelectLabel>명부 선택</ListSelectLabel>
                <ListSelect
                  value={effectiveListId ?? ""}
                  onChange={(e) => setSelectedListId(e.target.value)}>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </ListSelect>
              </ListSelectRow>
              <StatusCountGrid>
                {PRIMARY_STATUS_OPTIONS.map((p) => (
                  <StatusCountCard key={p} color={statusCardColor(p)}>
                    <div>{p}</div>
                    <div>{byPrimary[p] ?? 0}</div>
                  </StatusCountCard>
                ))}
                <StatusCountCard color={COLORS.blue[500]}>
                  <div>주식 수</div>
                  <div>{totalStocks.toLocaleString()}</div>
                </StatusCountCard>
              </StatusCountGrid>
              <DetailBreakdownBlock>
                <DetailBreakdownTitle>세부 상태별</DetailBreakdownTitle>
                <DetailBreakdownHint>
                  위 1차 요약·아래 범위 조건과 동일한 주주 목록을 기준으로,
                  저장된 상태 문자열에서 1차·세부를 나눈 뒤 세부별로 집계합니다.
                </DetailBreakdownHint>
                {detailBreakdownRows.length === 0 ? (
                  <DetailBreakdownHint style={{ marginBottom: 0 }}>
                    표시할 주주가 없습니다.
                  </DetailBreakdownHint>
                ) : (
                  <DetailTableScroll>
                    <DetailTable>
                      <thead>
                        <tr>
                          <DetailTh scope="col" style={{ width: "7.5rem" }}>
                            1차
                          </DetailTh>
                          <DetailTh scope="col">세부 상태</DetailTh>
                          <DetailTh scope="col" style={{ textAlign: "right" }}>
                            인원
                          </DetailTh>
                          <DetailTh scope="col" style={{ textAlign: "right" }}>
                            주식수
                          </DetailTh>
                        </tr>
                      </thead>
                      <tbody>
                        {detailBreakdownRows.map((row) => (
                          <tr key={`${row.primary}\t${row.detail}`}>
                            <DetailTd>
                              <PrimaryPill $bg={statusCardColor(row.primary)}>
                                {row.primary}
                              </PrimaryPill>
                            </DetailTd>
                            <DetailTd>{row.detail}</DetailTd>
                            <DetailTdNum>
                              {row.count.toLocaleString()}명
                            </DetailTdNum>
                            <DetailTdNum>
                              {row.stocks.toLocaleString()}
                            </DetailTdNum>
                          </tr>
                        ))}
                      </tbody>
                      <DetailTfoot>
                        <tr>
                          <DetailThFoot colSpan={2} scope="row">
                            합계 ({detailBreakdownRows.length}개 세부 구간)
                          </DetailThFoot>
                          <DetailTdFoot>
                            {detailTotals.count.toLocaleString()}명
                          </DetailTdFoot>
                          <DetailTdFoot>
                            {detailTotals.stocks.toLocaleString()}
                          </DetailTdFoot>
                        </tr>
                      </DetailTfoot>
                    </DetailTable>
                  </DetailTableScroll>
                )}
              </DetailBreakdownBlock>
              <ScopeFilterSection>
                <ScopeFilterSectionTitle>명부 범위</ScopeFilterSectionTitle>
                <ScopeFilterSectionHint>
                  아래는 위 집계·표와 같은 주주 목록을 좁히는 조건입니다. 1차
                  상태는 저장된 상태 문자열을 위 세부 표와 같은 규칙으로 1차로
                  분류한 뒤, 체크한 1차에 해당하는 주주만 남깁니다. 회사·담당은
                  DB 값과 입력값이 정확히 일치할 때만 포함됩니다.
                </ScopeFilterSectionHint>
                <ScopeFilterPanels>
                  <ScopeFilterPanel>
                    <ScopeFilterPanelTitle>
                      1차 상태로 좁히기
                    </ScopeFilterPanelTitle>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}>
                      {PRIMARY_STATUS_OPTIONS.map((st) => (
                        <label key={st}>
                          <input
                            type="checkbox"
                            checked={filterPrimary.includes(st)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterPrimary((prev) => [...prev, st])
                              } else {
                                setFilterPrimary((prev) =>
                                  prev.filter((x) => x !== st),
                                )
                              }
                            }}
                          />
                          {st}
                        </label>
                      ))}
                    </div>
                  </ScopeFilterPanel>
                  <ScopeFilterPanel>
                    <ScopeFilterPanelTitle>
                      소속·담당으로 좁히기
                    </ScopeFilterPanelTitle>
                    <FilterRow style={{ marginBottom: 0 }}>
                      <FilterGroup>
                        <ListSelectLabel>소속(회사)</ListSelectLabel>
                        <FilterInput
                          value={filterCompany}
                          onChange={(e) => setFilterCompany(e.target.value)}
                          placeholder="회사명 일부"
                        />
                      </FilterGroup>
                      <FilterGroup>
                        <ListSelectLabel>담당</ListSelectLabel>
                        <FilterInput
                          value={filterMaker}
                          onChange={(e) => setFilterMaker(e.target.value)}
                          placeholder="담당자"
                        />
                      </FilterGroup>
                    </FilterRow>
                  </ScopeFilterPanel>
                </ScopeFilterPanels>
                <ExportToolbar>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: COLORS.gray[500],
                      marginRight: "auto",
                    }}>
                    주주명부 보기와 동일한 엑셀 옵션(요약·변경이력·시트 분리
                    등)을 선택할 수 있습니다.
                  </span>
                  <ExportButton
                    type="button"
                    onClick={() => setExportDialogOpen(true)}>
                    엑셀보내기 ({shareholders.length}건)
                  </ExportButton>
                </ExportToolbar>
              </ScopeFilterSection>
              <ShareholderExportDialog
                open={exportDialogOpen}
                onClose={() => setExportDialogOpen(false)}
                onConfirm={runDashboardExport}
                filterDescriptionPreview={dashboardExportFilterPreview}
                rowCount={shareholders.length}
                scopeFootnote="(선택한 명부와 위 범위 조건이 적용된 주주입니다.)"
              />
            </ContentCard>
            <ContentCard>
              <CardHeader>
                <CardTitle>현장요원·명부 요약</CardTitle>
                <ViewAllLink href={`${workspaceAdminBase}/members`}>
                  멤버 관리 →
                </ViewAllLink>
              </CardHeader>
              <DetailBreakdownHint style={{ marginTop: "-0.25rem" }}>
                주주의 &quot;담당(마커)&quot; 값이 현장요원 이름·이메일·사용자
                ID와
                <strong> 정확히 같을 때만</strong> 해당 명부에 배정된 것으로
                집계합니다. 명부 배정은 멤버의 허용 명부와 같습니다.
              </DetailBreakdownHint>
              {makerSummaryLoading || changeHistorySummaryLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "2rem 0",
                  }}>
                  <GlobalSpinner width={28} height={28} dotColor="#8536FF" />
                </div>
              ) : workspaceMembersWithUsers.filter(
                  (m) => m.role === "field_agent",
                ).length === 0 ? (
                <DetailBreakdownHint style={{ marginBottom: 0 }}>
                  현장요원(용역) 역할 멤버가 없습니다. 멤버 관리에서 역할을
                  부여하면 이 요약이 채워집니다.
                </DetailBreakdownHint>
              ) : (
                <>
                  {fieldAgentProjectRows.length === 0 ? (
                    <DetailBreakdownHint style={{ marginBottom: 0 }}>
                      집계된 담당 주주가 없습니다. 주주 편집에서 담당 필드를
                      현장요원 표시 이름·이메일·ID와 맞춰 주세요.
                    </DetailBreakdownHint>
                  ) : (
                    <DetailTableScroll style={{ marginTop: "0.75rem" }}>
                      <DetailTable>
                        <thead>
                          <tr>
                            <DetailTh scope="col">현장요원</DetailTh>
                            <DetailTh scope="col">명부(프로젝트)</DetailTh>
                            <DetailTh
                              scope="col"
                              style={{ textAlign: "right" }}>
                              담당 건수
                            </DetailTh>
                            <DetailTh
                              scope="col"
                              style={{ textAlign: "right" }}>
                              완료(1차)
                            </DetailTh>
                            <DetailTh
                              scope="col"
                              style={{ textAlign: "right" }}>
                              주식수 합
                            </DetailTh>
                          </tr>
                        </thead>
                        <tbody>
                          {fieldAgentProjectRows.map((row) => (
                            <tr key={`${row.userId}\t${row.listId}`}>
                              <DetailTd>{row.agentLabel}</DetailTd>
                              <DetailTd>{row.listName}</DetailTd>
                              <DetailTdNum>
                                {row.assignedCount.toLocaleString()}명
                              </DetailTdNum>
                              <DetailTdNum>
                                {row.completedCount.toLocaleString()}명
                              </DetailTdNum>
                              <DetailTdNum>
                                {row.totalStocks.toLocaleString()}
                              </DetailTdNum>
                            </tr>
                          ))}
                        </tbody>
                      </DetailTable>
                    </DetailTableScroll>
                  )}
                  <DetailBreakdownBlock style={{ marginTop: "1rem" }}>
                    <DetailBreakdownTitle>
                      현장요원별 작업량
                    </DetailBreakdownTitle>
                    <DetailBreakdownHint>
                      사용자 관리에 등록된 현장요원 기준으로, 변경 이력 횟수,
                      메모 변경 횟수, 담당 주주의 회사별 1차 상태 건수를
                      집계합니다.
                    </DetailBreakdownHint>
                    <DetailTableScroll style={{ marginTop: "0.5rem" }}>
                      <DetailTable>
                        <thead>
                          <tr>
                            <DetailTh scope="col">현장요원</DetailTh>
                            <DetailTh
                              scope="col"
                              style={{ textAlign: "right" }}>
                              변경이력
                            </DetailTh>
                            <DetailTh
                              scope="col"
                              style={{ textAlign: "right" }}>
                              메모 변경
                            </DetailTh>
                            <DetailTh
                              scope="col"
                              style={{ textAlign: "right" }}>
                              담당 주주
                            </DetailTh>
                            <DetailTh scope="col">회사별 1차 상태</DetailTh>
                          </tr>
                        </thead>
                        <tbody>
                          {fieldAgentWorkRows.map((row) => (
                            <tr key={row.userId}>
                              <DetailTd>{row.agentLabel}</DetailTd>
                              <DetailTdNum>
                                {row.changeCount.toLocaleString()}회
                              </DetailTdNum>
                              <DetailTdNum>
                                {row.memoCount.toLocaleString()}회
                              </DetailTdNum>
                              <DetailTdNum>
                                {row.assignedCount.toLocaleString()}명
                              </DetailTdNum>
                              <DetailTd>
                                <CompanyStatusCell>
                                  {row.companyPrimary.length === 0 ? (
                                    <CompanyStatusEmpty>
                                      담당 주주 없음
                                    </CompanyStatusEmpty>
                                  ) : (
                                    row.companyPrimary.map((c) => (
                                      <CompanyStatusRow
                                        key={`${row.userId}\t${c.company}`}>
                                        <CompanyStatusName>
                                          {c.company}
                                        </CompanyStatusName>
                                        {PRIMARY_STATUS_OPTIONS.map((p) =>
                                          c.counts[p] > 0 ? (
                                            <CompanyStatusChip
                                              key={`${row.userId}\t${c.company}\t${p}`}
                                              $color={statusCardColor(p)}>
                                              {p} {c.counts[p]}건
                                            </CompanyStatusChip>
                                          ) : null,
                                        )}
                                      </CompanyStatusRow>
                                    ))
                                  )}
                                </CompanyStatusCell>
                              </DetailTd>
                            </tr>
                          ))}
                        </tbody>
                      </DetailTable>
                    </DetailTableScroll>
                  </DetailBreakdownBlock>
                </>
              )}
            </ContentCard>
          </ListDashboardGrid>
        </ListDashboardSection>
      )}

      <StatsGrid>
        <StatCard variant="blue">
          <StatTitle>워크스페이스 멤버</StatTitle>
          <StatValue>{memberCount}</StatValue>
        </StatCard>

        <StatCard variant="green">
          <StatTitle>이번 달 추가된 멤버</StatTitle>
          <StatValue>{newMembersThisMonth}</StatValue>
        </StatCard>

        <StatCard variant="purple">
          <StatTitle>관리자 수</StatTitle>
          <StatValue>{adminRoleCount}</StatValue>
        </StatCard>
      </StatsGrid>

      {/* 최근 활동 섹션 */}
      <ContentGrid>
        <ContentCard>
          <CardHeader>
            <CardTitle>최근 추가된 멤버</CardTitle>
            <ViewAllLink href={`${workspaceAdminBase}/users`}>
              전체 보기 →
            </ViewAllLink>
          </CardHeader>
          <UserList>
            {recentMembers.length === 0 ? (
              <UserItem>
                <UserDetails>
                  <UserEmail style={{ color: COLORS.gray[500] }}>
                    멤버가 없습니다.
                  </UserEmail>
                </UserDetails>
              </UserItem>
            ) : (
              recentMembers.map((m) => {
                const displayName =
                  m.name?.trim() || m.email?.trim() || m.user_id
                const initial = m.email?.[0] ?? m.user_id.slice(0, 2)

                return (
                  <UserItem key={m.id}>
                    <UserInfo>
                      <UserAvatar>
                        <UserAvatarText>
                          {String(initial).toUpperCase()}
                        </UserAvatarText>
                      </UserAvatar>
                      <UserDetails>
                        <UserEmail>{displayName}</UserEmail>
                        <UserDate>
                          추가일: {new Date(m.created_at).toLocaleDateString()}
                        </UserDate>
                      </UserDetails>
                    </UserInfo>
                    <UserRole isAdmin={m.role !== "field_agent"}>
                      {WORKSPACE_ROLE_LABELS[m.role as WorkspaceRole]}
                    </UserRole>
                  </UserItem>
                )
              })
            )}
          </UserList>
        </ContentCard>

        {/* 빠른 작업 */}
        <ContentCard>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
          </CardHeader>
          <QuickActions>
            <ActionButton href={`${workspaceAdminBase}/users`}>
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </ActionIcon>
              <ActionText>사용자 관리</ActionText>
            </ActionButton>

            <ActionButton href={`${workspaceAdminBase}/shareholders`}>
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </ActionIcon>
              <ActionText>주주명부 관리</ActionText>
            </ActionButton>

            <ActionButton href={`${workspaceAdminBase}/excel-import`}>
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </ActionIcon>
              <ActionText>파일 가져오기</ActionText>
            </ActionButton>

            <ActionButton href={`${workspaceAdminBase}/public-photo-drop-qr`}>
              <QrCode2
                sx={{ width: 32, height: 32, color: "#4b5563", mb: 0.5 }}
              />
              <ActionText>공개 접수 QR</ActionText>
            </ActionButton>

            <SettingsButton onClick={() => toast.info("준비 중인 기능입니다.")}>
              <ActionIcon
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </ActionIcon>
              <ActionText>시스템 설정</ActionText>
            </SettingsButton>
          </QuickActions>
        </ContentCard>
      </ContentGrid>
    </>
  )
}

/** /admin 접근 시 통합 관리 대시보드로 리다이렉트 */
export default function AdminDashboard() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined") router.replace("/admin/integrated")
  }, [router])

  return <FullPageLoader message="이동 중..." />
}
