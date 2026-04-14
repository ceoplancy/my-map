import styled from "@emotion/styled"
import MarkerDetailTable from "../marker-detail-table"
import Line from "../line"
import Button from "../button"
import Font from "../font"
import { format } from "date-fns"
import ShareholderStatusSelect from "@/components/shareholder/ShareholderStatusSelect"
import type { Excel } from "@/types/excel"
import type { ImportSpreadsheetRow } from "@/types/importSpreadsheet"
import { Dispatch, SetStateAction } from "react"
import type { UseMutateFunction } from "@tanstack/react-query"
import { removeTags } from "@/lib/utils"

interface DuplicateMakerPatchModalChildrenProps {
  duplicateMakerData: ImportSpreadsheetRow | null
  setDuplicateMakerData: Dispatch<SetStateAction<ImportSpreadsheetRow | null>>
  duplicateMakerDataState: ImportSpreadsheetRow | null
  setDuplicateMakerDataState: Dispatch<
    SetStateAction<ImportSpreadsheetRow | null>
  >
  duplicateMakerDataMutate: UseMutateFunction<
    void,
    unknown,
    {
      id: number
      patchData: ImportSpreadsheetRow
    },
    unknown
  >
  userId: string
}

const DuplicateMakerPatchModalChildren = ({
  duplicateMakerData, // patch > 중복 마커 state
  setDuplicateMakerData, // patch > 중복 마커 setState
  duplicateMakerDataState, // patch > 중복 마커 state
  setDuplicateMakerDataState, // patch > 중복 마커 setState
  duplicateMakerDataMutate, // 중복 마커 patch API
  userId, // 현재 로그인 유저 아이디
}: DuplicateMakerPatchModalChildrenProps) => {
  if (!duplicateMakerData) return null

  return (
    <div style={{ width: "100%" }}>
      <MarkerDetailTable data={duplicateMakerData} />

      <Line margin="2rem 0 2rem 0" />

      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          상태
        </Font>

        <div style={{ marginTop: "0.5rem" }}>
          <ShareholderStatusSelect
            idPrefix="dup-patch-status"
            value={duplicateMakerDataState?.status || "미방문"}
            onChange={(next) => {
              setDuplicateMakerDataState((prev: Excel | null) => {
                if (!prev) {
                  return duplicateMakerData
                    ? { ...duplicateMakerData, status: next }
                    : null
                }

                return { ...prev, status: next }
              })
            }}
          />
        </div>
      </InfoWrapper>

      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          메모
        </Font>

        <textarea
          style={{ marginTop: "0.5rem" }}
          value={removeTags(duplicateMakerDataState?.memo || "")}
          onChange={(e) => {
            setDuplicateMakerDataState((prev: ImportSpreadsheetRow | null) => {
              if (!prev) {
                return duplicateMakerData
                  ? { ...duplicateMakerData, memo: e.target.value }
                  : null
              } else {
                return {
                  ...prev,
                  memo: e.target.value,
                }
              }
            })
          }}
        />
      </InfoWrapper>

      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          휴대폰
        </Font>

        <input
          type="tel"
          style={{ marginTop: "0.5rem", width: "100%", padding: "0.5rem" }}
          value={removeTags(duplicateMakerDataState?.phone ?? "")}
          onChange={(e) => {
            setDuplicateMakerDataState((prev: Excel | null) => {
              if (!prev) {
                return duplicateMakerData
                  ? { ...duplicateMakerData, phone: e.target.value }
                  : null
              }

              return { ...prev, phone: e.target.value }
            })
          }}
        />
      </InfoWrapper>

      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          특이사항
        </Font>

        <textarea
          style={{ marginTop: "0.5rem" }}
          value={removeTags(duplicateMakerDataState?.special_notes ?? "")}
          onChange={(e) => {
            setDuplicateMakerDataState((prev: Excel | null) => {
              if (!prev) {
                return duplicateMakerData
                  ? { ...duplicateMakerData, special_notes: e.target.value }
                  : null
              }

              return { ...prev, special_notes: e.target.value }
            })
          }}
        />
      </InfoWrapper>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Button
          fontSize="14px"
          margin="4rem 0 0 0"
          backgroundColor="#5599FF"
          border="1px solid #5599FF"
          color="#fff"
          onClick={() => {
            if (duplicateMakerDataState) {
              const updated = {
                ...duplicateMakerDataState,
                status: duplicateMakerDataState.status,
                memo: duplicateMakerDataState.memo,
                phone: duplicateMakerDataState.phone,
                special_notes: duplicateMakerDataState.special_notes,
                history: [
                  ...(duplicateMakerDataState.history as string[]),
                  `${userId} ${format(new Date(), "yyyy/MM/dd/ HH:mm:ss")}`,
                ],
              }
              duplicateMakerDataMutate({
                id: duplicateMakerDataState.id,
                patchData: updated,
              })
            }
            setDuplicateMakerData(() => {
              if (!duplicateMakerDataState) {
                return duplicateMakerData
                  ? {
                      ...duplicateMakerData,
                      history: [
                        `${userId} ${format(new Date(), "yyyy/MM/dd/ HH:mm:ss")}`,
                      ],
                    }
                  : null
              }

              return {
                ...duplicateMakerDataState,
                history: [
                  ...(duplicateMakerDataState.history as string[]),
                  `${userId} ${format(new Date(), "yyyy/MM/dd/ HH:mm:ss")}`,
                ],
              }
            })
          }}>
          수정하기
        </Button>
      </div>
    </div>
  )
}

export default DuplicateMakerPatchModalChildren

const InfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 2rem;
`
