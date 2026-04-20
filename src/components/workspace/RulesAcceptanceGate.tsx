import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import styled from "@emotion/styled"
import { useMemo } from "react"
import { toast } from "react-toastify"

import { COLORS } from "@/styles/global-style"
import supabase from "@/lib/supabase/supabaseClient"
import { LIST_RULES_BODY_MARKDOWN } from "@/constants/listRules"
import GlobalSpinner from "@/components/ui/global-spinner"
import { reportError } from "@/lib/reportError"

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`

const Panel = styled.div`
  background: white;
  border-radius: 1rem;
  max-width: 32rem;
  width: 100%;
  max-height: min(90vh, 36rem);
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
  padding: 0 1.25rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  font-size: 0.875rem;
  color: ${COLORS.gray[700]};
  line-height: 1.6;
  white-space: pre-wrap;
`

const Footer = styled.div`
  padding: 1rem 1.25rem 1.25rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  border-top: 1px solid ${COLORS.gray[100]};
`

const Btn = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  background: ${COLORS.blue[600]};
  color: white;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${COLORS.blue[700]};
  }
`

type Props = {
  listIds: string[]
  userId: string | undefined
}

export default function RulesAcceptanceGate({ listIds, userId }: Props) {
  const queryClient = useQueryClient()

  const { data: pendingList, isLoading } = useQuery({
    queryKey: ["pendingListRules", listIds, userId],
    enabled: !!userId && listIds.length > 0,
    queryFn: async () => {
      const { data: lists, error: e1 } = await supabase
        .from("shareholder_lists")
        .select("id, name, rules_version")
        .in("id", listIds)
      if (e1) throw e1
      const { data: acc, error: e2 } = await supabase
        .from("list_rules_acceptances")
        .select("list_id, rules_version")
        .eq("user_id", userId as string)
        .in("list_id", listIds)
      if (e2) throw e2
      const accepted = new Map(
        (acc ?? []).map((r) => [r.list_id, r.rules_version]),
      )
      const pending = (lists ?? []).find(
        (l) => accepted.get(l.id) !== l.rules_version,
      )

      return pending ?? null
    },
  })

  const accept = useMutation({
    mutationFn: async () => {
      if (!userId || !pendingList) {
        return
      }
      const { error } = await supabase.from("list_rules_acceptances").upsert(
        {
          list_id: pendingList.id,
          user_id: userId,
          rules_version: pendingList.rules_version,
          accepted_at: new Date().toISOString(),
        },
        { onConflict: "list_id,user_id" },
      )
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["pendingListRules"],
      })
      toast.success("규율에 동의했습니다.")
    },
    onError: (e) => {
      reportError(e, { toastMessage: "동의 저장에 실패했습니다." })
    },
  })

  const label = useMemo(() => {
    if (!pendingList) {
      return ""
    }

    return pendingList.name?.trim() || "주주명부"
  }, [pendingList])

  if (!userId || listIds.length === 0) return null
  if (isLoading) {
    return (
      <Backdrop>
        <Panel style={{ padding: "2rem", alignItems: "center" }}>
          <GlobalSpinner width={28} height={28} dotColor="#8536FF" />
        </Panel>
      </Backdrop>
    )
  }
  if (!pendingList) {
    return null
  }

  return (
    <Backdrop role="presentation">
      <Panel role="dialog" aria-modal="true" aria-labelledby="rules-gate-title">
        <Title id="rules-gate-title">{label} — 이용 규율 동의</Title>
        <Body>{LIST_RULES_BODY_MARKDOWN}</Body>
        <Footer>
          <Btn
            type="button"
            disabled={accept.isPending}
            onClick={() => accept.mutate()}>
            동의하고 계속하기
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  )
}
