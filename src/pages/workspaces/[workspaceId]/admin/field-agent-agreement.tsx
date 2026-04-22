import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import styled from "@emotion/styled"
import { Description } from "@mui/icons-material"
import AdminLayout from "@/layouts/AdminLayout"
import { useGetUserData } from "@/api/auth"
import { useWorkspaceAdminRoute } from "@/hooks/useWorkspaceAdminRoute"
import GlobalSpinner from "@/components/ui/global-spinner"
import { COLORS } from "@/styles/global-style"
import { getAccessToken } from "@/lib/auth/clientAuth"
import { reportError } from "@/lib/reportError"
import { toast } from "react-toastify"

const SpinnerFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
`

const PageTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const Help = styled.p`
  font-size: 0.875rem;
  color: ${COLORS.gray[600]};
  margin: 0 0 1rem;
  line-height: 1.55;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 28rem;
  padding: 0.75rem 1rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }
`

const Actions = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`

const Btn = styled.button`
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  background: ${COLORS.blue[600]};
  color: white;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${COLORS.blue[700]};
  }
`

type GetResponse = {
  body: string
  agreementUpdatedAt: string
}

export default function WorkspaceFieldAgentAgreementAdminPage() {
  const router = useRouter()
  const { workspaceId } = router.query as { workspaceId?: string }
  const { resolvedWorkspace, isReady } = useWorkspaceAdminRoute()
  const { data: user } = useGetUserData()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState("")

  const loadQuery = useQuery({
    queryKey: ["fieldAgentAgreementAdminLoad", workspaceId],
    enabled: !!workspaceId && isReady,
    queryFn: async (): Promise<GetResponse> => {
      const tok = await getAccessToken()
      if (!tok) throw new Error("no_token")
      const res = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId as string)}/field-agent-agreement`,
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

      return (await res.json()) as GetResponse
    },
  })

  useEffect(() => {
    if (loadQuery.data?.body !== undefined) {
      setDraft(loadQuery.data.body)
    }
  }, [loadQuery.data?.body])

  const save = useMutation({
    mutationFn: async () => {
      const tok = await getAccessToken()
      if (!tok) throw new Error("no_token")
      const res = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId as string)}/field-agent-agreement`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tok}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: draft }),
        },
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
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["fieldAgentAgreementAdminLoad"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["fieldAgentAgreementStatus"],
      })
      toast.success(
        "저장했습니다. 현장요원은 다음 접속 시 다시 동의해야 합니다.",
      )
    },
    onError: (e) => {
      reportError(e, { toastMessage: "저장에 실패했습니다." })
    },
  })

  if (!isReady) {
    return (
      <AdminLayout>
        <SpinnerFrame>
          <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
        </SpinnerFrame>
      </AdminLayout>
    )
  }

  if (!resolvedWorkspace) {
    if (typeof window !== "undefined") router.replace("/workspaces")

    return null
  }

  if (!user?.user) return null

  return (
    <AdminLayout>
      <PageTitle>
        <Description aria-hidden />
        현장요원 동의문
      </PageTitle>
      <Help>
        이 워크스페이스에 소속된 <strong>현장요원</strong>이 지도·검색 등 업무
        화면을 쓰기 전에 반드시 읽고 동의하는 문구입니다. 저장하면 동의문이
        갱신된 것으로 처리되어, 이미 동의한 요원도 <strong>다시 동의</strong>
        해야 합니다.
      </Help>
      {loadQuery.isLoading ? (
        <SpinnerFrame>
          <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
        </SpinnerFrame>
      ) : loadQuery.isError ? (
        <p style={{ color: COLORS.red[600] }}>
          {loadQuery.error instanceof Error
            ? loadQuery.error.message
            : "오류가 발생했습니다."}
        </p>
      ) : (
        <>
          <TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            aria-label="현장요원 동의문 본문"
          />
          <Actions>
            <Btn
              type="button"
              disabled={save.isPending || !draft.trim()}
              onClick={() => save.mutate()}>
              저장
            </Btn>
          </Actions>
          {loadQuery.data?.agreementUpdatedAt ? (
            <p
              style={{
                marginTop: "0.75rem",
                fontSize: "0.75rem",
                color: COLORS.gray[500],
              }}>
              마지막 갱신(서버 기준):{" "}
              {new Date(loadQuery.data.agreementUpdatedAt).toLocaleString(
                "ko-KR",
              )}
            </p>
          ) : null}
        </>
      )}
    </AdminLayout>
  )
}
