import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import styled from "@emotion/styled"
import { useState } from "react"
import { toast } from "react-toastify"

import { usePostSignOut } from "@/api/auth"
import { COLORS } from "@/styles/global-style"
import GlobalSpinner from "@/components/ui/global-spinner"
import { reportError } from "@/lib/reportError"
import { getAccessToken } from "@/lib/auth/clientAuth"

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 600;
  background: rgba(15, 23, 42, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`

const Panel = styled.div`
  background: white;
  border-radius: 1rem;
  max-width: 36rem;
  width: 100%;
  max-height: min(92vh, 42rem);
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`

const Title = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  padding: 1.25rem 1.25rem 0;
`

const Body = styled.div`
  padding: 0.75rem 1.25rem 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  font-size: 0.8125rem;
  color: ${COLORS.gray[700]};
  line-height: 1.65;
  white-space: pre-wrap;
`

const CheckboxRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0.75rem 1.25rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${COLORS.gray[800]};
  cursor: pointer;
  user-select: none;
`

const Footer = styled.div`
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
  border-top: 1px solid ${COLORS.gray[100]};
`

const BtnPrimary = styled.button`
  padding: 0.5rem 1rem;
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

const BtnGhost = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  border: 1px solid ${COLORS.gray[300]};
  cursor: pointer;
  background: white;
  color: ${COLORS.gray[700]};
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${COLORS.gray[50]};
  }
`

type AgreementStatus = {
  body: string
  agreementUpdatedAt: string
  acceptedAt: string | null
  needsAcceptance: boolean
  isFieldAgent: boolean
}

type Props = {
  workspaceId: string | null
}

export default function FieldAgentAgreementGate({ workspaceId }: Props) {
  const queryClient = useQueryClient()
  const signOutMutation = usePostSignOut()
  const [checked, setChecked] = useState(false)

  const statusQuery = useQuery({
    queryKey: ["fieldAgentAgreementStatus", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<AgreementStatus> => {
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

      return (await res.json()) as AgreementStatus
    },
  })

  const accept = useMutation({
    mutationFn: async () => {
      const tok = await getAccessToken()
      if (!tok) throw new Error("no_token")
      const res = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId as string)}/field-agent-agreement/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}` },
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
        queryKey: ["fieldAgentAgreementStatus"],
      })
      setChecked(false)
      toast.success("동의가 저장되었습니다.")
    },
    onError: (e) => {
      reportError(e, { toastMessage: "동의 저장에 실패했습니다." })
    },
  })

  const onDecline = async () => {
    try {
      await signOutMutation.mutateAsync()
    } catch (e) {
      reportError(e, { toastMessage: "로그아웃에 실패했습니다." })
    }
  }

  if (!workspaceId) return null

  if (statusQuery.isLoading) {
    return (
      <Backdrop>
        <Panel style={{ padding: "2rem", alignItems: "center" }}>
          <GlobalSpinner width={28} height={28} dotColor="#8536FF" />
        </Panel>
      </Backdrop>
    )
  }

  if (statusQuery.isError) {
    return (
      <Backdrop role="presentation">
        <Panel
          role="alertdialog"
          aria-labelledby="fa-agreement-err-title"
          style={{ padding: "1.5rem" }}>
          <Title id="fa-agreement-err-title">
            동의문을 불러오지 못했습니다
          </Title>
          <Body style={{ paddingTop: "0.5rem" }}>
            {statusQuery.error instanceof Error
              ? statusQuery.error.message
              : "잠시 후 다시 시도해 주세요."}
          </Body>
          <Footer>
            <BtnGhost type="button" onClick={() => void onDecline()}>
              로그아웃
            </BtnGhost>
          </Footer>
        </Panel>
      </Backdrop>
    )
  }

  const data = statusQuery.data
  if (!data?.needsAcceptance) {
    return null
  }

  return (
    <Backdrop role="presentation">
      <Panel
        role="dialog"
        aria-modal="true"
        aria-labelledby="fa-agreement-title">
        <Title id="fa-agreement-title">현장 요원 업무 및 비밀유지 동의</Title>
        <Body>{data.body}</Body>
        <CheckboxRow>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>위 모든 약관 및 서약 내용에 동의합니다. (필수)</span>
        </CheckboxRow>
        <Footer>
          <BtnGhost
            type="button"
            disabled={signOutMutation.isPending || accept.isPending}
            onClick={() => void onDecline()}>
            동의하지 않고 나가기
          </BtnGhost>
          <BtnPrimary
            type="button"
            disabled={!checked || accept.isPending || signOutMutation.isPending}
            onClick={() => accept.mutate()}>
            동의하고 업무 시작
          </BtnPrimary>
        </Footer>
      </Panel>
    </Backdrop>
  )
}
