import { useEffect, useMemo, useState } from "react"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import {
  AGM_LEAVES,
  E_VOTE_LEAVES,
  PROXY_COMPLETE,
  PrimaryStatusGroup,
  STATUS_FAILURE_HOLD_DETAILS,
  buildStatusFromSteps,
  parseStatusToSteps,
} from "@/lib/shareholderStatus"

const PRIMARY_OPTIONS: { id: PrimaryStatusGroup; label: string }[] = [
  { id: "미방문", label: "미방문" },
  { id: "전자투표", label: "전자투표" },
  { id: "주총", label: "주총" },
  { id: "의결권_위임", label: "의결권 위임 완료" },
  { id: "실패", label: "실패" },
  { id: "보류", label: "보류" },
]

function defaultSecondary(
  primary: PrimaryStatusGroup,
  previous: string,
): string {
  if (primary === "전자투표") {
    return (E_VOTE_LEAVES as readonly string[]).includes(previous)
      ? previous
      : E_VOTE_LEAVES[0]
  }
  if (primary === "주총") {
    return (AGM_LEAVES as readonly string[]).includes(previous)
      ? previous
      : AGM_LEAVES[0]
  }
  if (primary === "실패" || primary === "보류") {
    return (STATUS_FAILURE_HOLD_DETAILS as readonly string[]).includes(
      previous as (typeof STATUS_FAILURE_HOLD_DETAILS)[number],
    )
      ? previous
      : STATUS_FAILURE_HOLD_DETAILS[0]
  }

  return ""
}

type Props = {
  value: string
  onChange: (_value: string) => void
  idPrefix?: string
}

export default function ShareholderStatusSelect({
  value,
  onChange,
  idPrefix = "status",
}: Props) {
  const [primary, setPrimary] = useState<PrimaryStatusGroup>(
    () => parseStatusToSteps(value).primary,
  )
  const [secondary, setSecondary] = useState<string>(
    () => parseStatusToSteps(value).secondary,
  )

  useEffect(() => {
    const p = parseStatusToSteps(value)
    setPrimary(p.primary)
    setSecondary(p.secondary)
  }, [value])

  const showSecond =
    primary === "전자투표" ||
    primary === "주총" ||
    primary === "실패" ||
    primary === "보류"

  const secondOptions = useMemo(() => {
    if (primary === "전자투표") return [...E_VOTE_LEAVES]
    if (primary === "주총") return [...AGM_LEAVES]
    if (primary === "실패" || primary === "보류") {
      return [...STATUS_FAILURE_HOLD_DETAILS]
    }

    return []
  }, [primary])

  const handlePrimaryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPrimary = e.target.value as PrimaryStatusGroup
    setPrimary(nextPrimary)
    const sec = defaultSecondary(nextPrimary, secondary)
    setSecondary(sec)
    if (nextPrimary === "의결권_위임") {
      onChange(PROXY_COMPLETE)

      return
    }
    if (nextPrimary === "미방문") {
      onChange("미방문")

      return
    }
    onChange(buildStatusFromSteps(nextPrimary, sec))
  }

  const handleSecondaryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sec = e.target.value
    setSecondary(sec)
    onChange(buildStatusFromSteps(primary, sec))
  }

  return (
    <Row>
      <FieldGroup>
        <SubLabel htmlFor={`${idPrefix}-p`}>구분</SubLabel>
        <StyledSelect
          id={`${idPrefix}-p`}
          value={primary}
          onChange={handlePrimaryChange}>
          {PRIMARY_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </StyledSelect>
      </FieldGroup>
      {showSecond && (
        <FieldGroup>
          <SubLabel htmlFor={`${idPrefix}-s`}>세부 상태</SubLabel>
          <StyledSelect
            id={`${idPrefix}-s`}
            value={
              primary === "실패" || primary === "보류"
                ? secondary || secondOptions[0]
                : secondary
            }
            onChange={handleSecondaryChange}>
            {secondOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </StyledSelect>
        </FieldGroup>
      )}
    </Row>
  )
}

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SubLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${COLORS.gray[600]};
`

const StyledSelect = styled.select`
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 8px;
  background: white;
  color: ${COLORS.gray[900]};
`
