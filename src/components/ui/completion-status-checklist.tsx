import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import {
  COMPLETION_DOC_LABEL_DONE,
  COMPLETION_DOC_LABEL_HOLD,
  COMPLETION_ID_LABEL_DONE,
  COMPLETION_ID_LABEL_HOLD,
} from "@/lib/shareholderStatus"

export type CompletionAxisChoice = "done" | "hold" | ""

type Props = {
  doc: CompletionAxisChoice
  id: CompletionAxisChoice
  onDoc: (_axis: "done" | "hold") => void
  onId: (_axis: "done" | "hold") => void
  disabled?: boolean
}

const CompletionStatusChecklist = ({
  doc,
  id,
  onDoc,
  onId,
  disabled = false,
}: Props) => {
  return (
    <Wrap role="group" aria-label="완료 처리 확인">
      <GroupLabel>의결권 서류</GroupLabel>
      <Row role="radiogroup" aria-label="의결권 서류">
        <Choice
          type="button"
          $active={doc === "done"}
          disabled={disabled}
          onClick={() => onDoc("done")}>
          {COMPLETION_DOC_LABEL_DONE}
        </Choice>
        <Choice
          type="button"
          $active={doc === "hold"}
          disabled={disabled}
          onClick={() => onDoc("hold")}>
          {COMPLETION_DOC_LABEL_HOLD}
        </Choice>
      </Row>
      <GroupLabel style={{ marginTop: "0.85rem" }}>신분증</GroupLabel>
      <Row role="radiogroup" aria-label="신분증">
        <Choice
          type="button"
          $active={id === "done"}
          disabled={disabled}
          onClick={() => onId("done")}>
          {COMPLETION_ID_LABEL_DONE}
        </Choice>
        <Choice
          type="button"
          $active={id === "hold"}
          disabled={disabled}
          onClick={() => onId("hold")}>
          {COMPLETION_ID_LABEL_HOLD}
        </Choice>
      </Row>
    </Wrap>
  )
}

export default CompletionStatusChecklist

const Wrap = styled.div`
  margin-top: 0.35rem;
`

const GroupLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${COLORS.gray[600]};
  margin-bottom: 0.35rem;
`

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`

const Choice = styled.button<{ $active: boolean }>`
  flex: 1;
  min-width: 0;
  min-height: 2.5rem;
  padding: 0.45rem 0.65rem;
  border-radius: 0.65rem;
  border: 1px solid ${(p) => (p.$active ? COLORS.green[400] : COLORS.gray[200])};
  background: ${(p) => (p.$active ? COLORS.green[50] : "white")};
  color: ${(p) => (p.$active ? COLORS.green[900] : COLORS.gray[700])};
  font-size: 0.8125rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  cursor: pointer;
  text-align: center;
  line-height: 1.3;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    border-color: ${COLORS.gray[300]};
    background: ${(p) => (p.$active ? COLORS.green[50] : COLORS.gray[50])};
  }
`
