import { useRouter } from "next/router"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import styled from "@emotion/styled"

import { useSession } from "@/api/auth"
import { getAccessToken } from "@/lib/auth/clientAuth"
import { COLORS } from "@/styles/global-style"
import GlobalSpinner from "@/components/ui/global-spinner"
import supabase from "@/lib/supabase/supabaseClient"
import { ROUTES } from "@/constants/routes"
import { formatDateTimeKo } from "@/lib/formatDateTimeKo"
import FieldAgentAgreementGate from "@/components/workspace/FieldAgentAgreementGate"

const Page = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  box-sizing: border-box;
  padding: max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    max(1.25rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  max-width: 960px;
  margin: 0 auto;
  background: ${COLORS.background.light};
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${COLORS.gray[900]};
  margin: 0 0 0.5rem;
`

const NavRow = styled.p`
  margin: 0 0 0.75rem;
  font-size: 0.9375rem;
  a {
    color: ${COLORS.blue[600]};
    font-weight: 700;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`

const SubNav = styled.p`
  margin: 0 0 1rem;
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

const Select = styled.select`
  margin-bottom: 1rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid ${COLORS.gray[200]};
`

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const Card = styled.article`
  background: white;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`

type InboxItem = {
  id: string
  path: string
  created_at: string
  content_type: string | null
  original_filename: string | null
  downloadUrl: string
}

export default function PhotoDropInboxPage() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId?: string }
  const { data: session } = useSession()
  const [listId, setListId] = useState<string>("")

  const listsQuery = useQuery({
    queryKey: ["shareholderListsForPhotoInbox", workspaceId],
    enabled: !!workspaceId && !!session?.user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shareholder_lists")
        .select("id, name")
        .eq("workspace_id", workspaceId as string)
        .order("created_at", { ascending: false })
      if (error) throw error

      return data ?? []
    },
  })

  const inboxQuery = useQuery({
    queryKey: ["photoDropInbox", listId],
    enabled: !!listId && !!session?.access_token,
    queryFn: async () => {
      const tok = await getAccessToken()
      if (!tok) throw new Error("no_token")
      const res = await fetch(
        `/api/workspace/lists/${encodeURIComponent(listId)}/photo-dropbox`,
        { headers: { Authorization: `Bearer ${tok}` } },
      )
      if (!res.ok) {
        let msg = res.statusText
        try {
          const j = (await res.json()) as { error?: string }
          if (j.error) msg = j.error
        } catch {
          void 0
        }
        throw new Error(msg)
      }
      const body = (await res.json()) as { items: InboxItem[] }

      return body.items
    },
  })

  const listsData = listsQuery.data

  useEffect(() => {
    const lists = listsData ?? []
    if (lists.length > 0 && !listId) setListId(lists[0].id)
  }, [listsData, listId])

  if (listsQuery.isPending) {
    return (
      <Page>
        <GlobalSpinner width={26} height={26} dotColor="#8536FF" />
      </Page>
    )
  }

  if (!workspaceId) {
    return null
  }

  return (
    <Page>
      <FieldAgentAgreementGate
        workspaceId={typeof workspaceId === "string" ? workspaceId : null}
      />
      <Title>공개 접수함</Title>
      <NavRow>
        <Link href={`/workspaces/${workspaceId}`}>지도로 돌아가기</Link>
      </NavRow>
      <p style={{ marginBottom: "1rem", color: COLORS.gray[600] }}>
        누구나 접수 링크로 올라온 사진만 모아 둡니다. 로그인한 워크스페이스 멤버
        중 이 명부에 접근 권한이 있는 사람만 볼 수 있습니다.
      </p>
      <SubNav>
        <Link href={ROUTES.workspaces}>상장사 목록</Link>
        {" · "}
        <Link href={`/workspaces/${workspaceId}/activity`}>활동 기록</Link>
      </SubNav>
      <div>
        <label htmlFor="inbox-list" style={{ marginRight: 8 }}>
          명부
        </label>
        <Select
          id="inbox-list"
          value={listId}
          onChange={(e) => setListId(e.target.value)}>
          {(listsData ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>
      {inboxQuery.isPending ? (
        <GlobalSpinner width={22} height={22} dotColor="#8536FF" />
      ) : inboxQuery.isError ? (
        <p style={{ color: COLORS.red[600] }}>
          {inboxQuery.error instanceof Error
            ? inboxQuery.error.message
            : "목록을 불러오지 못했습니다."}
        </p>
      ) : (
        <CardList>
          {(inboxQuery.data ?? []).length === 0 ? (
            <p style={{ color: COLORS.gray[500] }}>접수된 사진이 없습니다.</p>
          ) : (
            (inboxQuery.data ?? []).map((item) => (
              <Card key={item.id}>
                <a
                  href={item.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flexShrink: 0 }}>
                  <img
                    src={item.downloadUrl}
                    alt=""
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 6,
                      display: "block",
                    }}
                  />
                </a>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: COLORS.gray[800],
                    }}>
                    {formatDateTimeKo(item.created_at)}
                  </div>
                  {item.original_filename ? (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: COLORS.gray[600],
                        wordBreak: "break-all",
                        marginTop: 4,
                      }}>
                      {item.original_filename}
                    </div>
                  ) : null}
                  <a
                    href={item.downloadUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      fontSize: "0.8rem",
                      color: COLORS.blue[600],
                    }}>
                    다운로드 (1시간 유효 링크)
                  </a>
                </div>
              </Card>
            ))
          )}
        </CardList>
      )}
    </Page>
  )
}
