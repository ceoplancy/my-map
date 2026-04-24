import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import styled from "@emotion/styled"
import { Search as SearchIcon } from "@mui/icons-material"

import { useAuth, useMyWorkspaces } from "@/api/auth"
import { useCurrentWorkspace } from "@/store/workspaceState"
import {
  useVisibleListIds,
  useShareholders,
  type ShareholdersParams,
} from "@/api/workspace"
import { COLORS } from "@/styles/global-style"
import { ROUTES } from "@/constants/routes"
import GlobalSpinner from "@/components/ui/global-spinner"
import type { MapMarkerData } from "@/types/map"
import FieldAgentAgreementGate from "@/components/workspace/FieldAgentAgreementGate"

const Page = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  box-sizing: border-box;
  padding: max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    max(1.25rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  max-width: 720px;
  margin: 0 auto;
  background: ${COLORS.background.light};
`

const Title = styled.h1`
  font-size: 1.375rem;
  font-weight: 800;
  color: ${COLORS.gray[900]};
  margin: 0 0 0.75rem;
`

const NavRow = styled.p`
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  color: ${COLORS.gray[600]};
  a {
    color: ${COLORS.blue[600]};
    font-weight: 600;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`

const SearchRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  margin-bottom: 1rem;
`

const SearchField = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  padding: 0.55rem 0.85rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.75rem;
  background: white;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
`

const SearchSubmit = styled.button`
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 1rem;
  border-radius: 0.75rem;
  border: none;
  background: ${COLORS.purple[600]};
  color: white;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${COLORS.purple[700]};
  }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  font-size: 0.9375rem;
  outline: none;
  background: transparent;
  &::placeholder {
    color: ${COLORS.gray[400]};
  }
`

const Hint = styled.p`
  margin: 0 0 1rem;
  font-size: 0.8125rem;
  color: ${COLORS.gray[500]};
  line-height: 1.5;
`

const ListCard = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  background: white;
  border-radius: 0.75rem;
  border: 1px solid ${COLORS.gray[100]};
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
`

const HitButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  width: 100%;
  text-align: left;
  padding: 0.85rem 1rem;
  min-height: 3rem;
  border: none;
  border-bottom: 1px solid ${COLORS.gray[100]};
  background: transparent;
  font-size: 0.875rem;
  color: ${COLORS.gray[800]};
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${COLORS.gray[50]};
  }
  small {
    font-size: 0.75rem;
    color: ${COLORS.gray[500]};
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`

const Empty = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: ${COLORS.gray[500]};
  line-height: 1.55;
`

const SpinnerWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
`

export default function WorkspaceShareholderSearchPage() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId?: string }
  const { user, session, isLoading: authLoading } = useAuth()
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces()
  const [, setCurrentWorkspace] = useCurrentWorkspace()

  const resolvedWorkspace =
    workspaceId && Array.isArray(workspaces)
      ? (workspaces.find((w) => w.id === workspaceId) ?? null)
      : null

  useEffect(() => {
    if (!router.isReady || !workspaceId) return
    if (workspacesLoading) return
    if (!resolvedWorkspace) {
      if (authLoading) return
      if (!session) {
        void router.replace(ROUTES.signIn)

        return
      }
      void router.replace(ROUTES.workspaces)

      return
    }
    setCurrentWorkspace(resolvedWorkspace)
  }, [
    router.isReady,
    workspaceId,
    workspacesLoading,
    resolvedWorkspace,
    setCurrentWorkspace,
    router,
    authLoading,
    session,
  ])

  const userId = user?.id
  const mapWorkspaceId = resolvedWorkspace?.id ?? null
  const visibleListIds = useVisibleListIds(mapWorkspaceId, userId)
  const [searchInput, setSearchInput] = useState("")
  const [committedSearch, setCommittedSearch] = useState("")

  const shareholderParams = useMemo((): ShareholdersParams => {
    return {
      listIds: visibleListIds.length > 0 ? visibleListIds : null,
      search: committedSearch || undefined,
      requireSearchToFetch: true,
    }
  }, [visibleListIds, committedSearch])

  const { data: shareholderRows, isPending: shareholdersPending } =
    useShareholders(shareholderParams)

  const hits = useMemo((): MapMarkerData[] => {
    if (!committedSearch) return []

    return (shareholderRows ?? []).slice(0, 200)
  }, [shareholderRows, committedSearch])

  const runSearch = () => {
    setCommittedSearch(searchInput.trim())
  }

  const goToMap = (m: MapMarkerData) => {
    if (!workspaceId || typeof workspaceId !== "string") return
    void router.push(
      `/workspaces/${workspaceId}?highlight=${encodeURIComponent(m.id)}`,
    )
  }

  useEffect(() => {
    if (authLoading || session) return
    void router.replace(ROUTES.signIn)
  }, [authLoading, router, session])

  const resolving =
    !router.isReady ||
    !workspaceId ||
    workspacesLoading ||
    (workspaceId && !resolvedWorkspace)

  if (resolving) {
    return (
      <SpinnerWrap>
        <GlobalSpinner width={22} height={22} dotColor="#8536FF" />
      </SpinnerWrap>
    )
  }

  return (
    <Page>
      <FieldAgentAgreementGate
        workspaceId={typeof workspaceId === "string" ? workspaceId : null}
      />
      <Title>주주 검색</Title>
      <NavRow>
        <Link href={`/workspaces/${workspaceId}`}>지도로 돌아가기</Link>
      </NavRow>
      <SearchRow>
        <SearchField>
          <SearchIcon
            sx={{ color: COLORS.gray[500], fontSize: 22 }}
            aria-hidden
          />
          <SearchInput
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                runSearch()
              }
            }}
            placeholder="이름 또는 주소"
            aria-label="검색어"
            autoComplete="off"
            autoFocus
          />
        </SearchField>
        <SearchSubmit
          type="button"
          disabled={visibleListIds.length === 0}
          onClick={() => runSearch()}>
          검색
        </SearchSubmit>
      </SearchRow>
      <Hint>
        노출된 주주명부 안에서 이름·주소 등으로 찾습니다. 항목을 누르면 지도로
        이동하며 해당 주주 위치로 맞춥니다. (최대 200건까지 표시)
      </Hint>
      {visibleListIds.length === 0 ? (
        <Empty>
          지도에 노출된 주주명부가 없어 검색할 수 없습니다. 관리자에게 명부
          노출을 요청하거나 지도 화면에서 워크스페이스를 확인해 주세요.
        </Empty>
      ) : !committedSearch ? (
        <Empty>
          검색어를 입력한 뒤 검색을 누르면 결과가 여기에 표시됩니다.
        </Empty>
      ) : committedSearch && shareholdersPending ? (
        <SpinnerWrap>
          <GlobalSpinner width={22} height={22} dotColor="#8536FF" />
        </SpinnerWrap>
      ) : hits.length === 0 ? (
        <Empty>검색 결과가 없습니다.</Empty>
      ) : (
        <ListCard aria-label="검색 결과">
          {hits.map((m) => (
            <li key={m.id}>
              <HitButton type="button" onClick={() => goToMap(m)}>
                <span>
                  {[m.company, m.name].filter(Boolean).join(" · ") ||
                    "이름 없음"}
                </span>
                <small>{m.address ?? m.latlngaddress ?? ""}</small>
              </HitButton>
            </li>
          ))}
        </ListCard>
      )}
    </Page>
  )
}
