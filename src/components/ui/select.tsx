"use client"

import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"

/**
 * 헤더 "엔트리" 셀렉트박스와 동일한 스타일의 공통 Select.
 * appearance: none + 커스텀 SVG 화살표로 프로젝트 전반 셀렉트 UI 통일.
 */
const StyledSelect = styled.select`
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 6px;
  font-size: 0.875rem;
  background-color: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1rem;
  color: ${COLORS.gray[700]};
  min-width: 0;
  appearance: none;
  cursor: pointer;
  box-sizing: border-box;

  &:hover {
    border-color: ${COLORS.gray[400]};
  }
  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export default function Select(props: SelectProps) {
  return <StyledSelect {...props} />
}

export { StyledSelect }
