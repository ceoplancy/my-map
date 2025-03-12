import styled from "styled-components"
import Line from "../line"
import Button from "../button"
import Font from "../font"
import { format } from "date-fns"
import ExcelDataTable from "../excel-data-table"
import { Excel } from "@/types/excel"
import { Dispatch, SetStateAction } from "react"
import { UseMutateFunction } from "react-query"

interface DuplicateMakerPatchModalChildrenProps {
  duplicateMakerData: Excel | null
  setDuplicateMakerData: Dispatch<SetStateAction<Excel | null>>
  duplicateMakerDataState: Excel | null
  setDuplicateMakerDataState: Dispatch<SetStateAction<Excel | null>>
  duplicateMakerDataMutate: UseMutateFunction<
    void,
    unknown,
    {
      id: number
      patchData: Excel
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
  const removeTags = (str: string) => {
    return str?.replace(/<\/?[^>]+(>|$)/g, "")
  }

  if (!duplicateMakerData) return null

  return (
    <div style={{ width: "100%" }}>
      <ExcelDataTable data={duplicateMakerData} />
      {/* <table
        style={{
          border: '1px solid #ccc',
          borderCollapse: 'collapse',
          width: '100%',
        }}
      >
        <tbody>
          <tr style={{ border: '1px solid #ccc' }}>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              주주번호
            </td>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              {duplicateMakerData.id}
            </td>
          </tr>
          <tr style={{ border: '1px solid #ccc' }}>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              이름
            </td>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              {duplicateMakerData.name}
            </td>
          </tr>
          <tr style={{ border: '1px solid #ccc' }}>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              주식수
            </td>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              {duplicateMakerData.stocks}
            </td>
          </tr>
          <tr style={{ border: '1px solid #ccc' }}>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              주소
            </td>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
              }}
            >
              {duplicateMakerData.address}
            </td>
          </tr>
          <tr style={{ border: '1px solid #ccc' }}>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              상태
            </td>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              {duplicateMakerData.status}
            </td>
          </tr>
          <tr style={{ border: '1px solid #ccc' }}>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              회사
            </td>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              {duplicateMakerData.company}
            </td>
          </tr>
          <tr style={{ border: '1px solid #ccc' }}>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              메모
            </td>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              {duplicateMakerData.memo}
            </td>
          </tr>
          <tr style={{ border: '1px solid #ccc' }}>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              변경이력
            </td>
            <td
              style={{
                fontSize: '14px',
                border: '1px solid #ccc',
                padding: '10px',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'pre-wrap',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}
              >
                {duplicateMakerData?.history !== null &&
                  duplicateMakerData?.history?.map((x) => {
                    return (
                      <Font key={x} fontSize="14px">
                        {x}
                      </Font>
                    );
                  })}
              </div>
            </td>
          </tr>
        </tbody>
      </table> */}

      <Line margin="2rem 0 2rem 0" />

      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          상태
        </Font>

        <select
          style={{ marginTop: "0.5rem" }}
          name="status-select"
          id="status-select"
          value={duplicateMakerDataState?.status || ""}
          onChange={(e) => {
            setDuplicateMakerDataState((prev) => {
              if (!prev) {
                return duplicateMakerData
                  ? { ...duplicateMakerData, status: e.target.value }
                  : null
              }

              return { ...prev, status: e.target.value }
            })
          }}>
          <option
            value="미방문"
            // selected={makerData.status === "미방문" ? true : false}
          >
            미방문
          </option>

          <option
            value="완료"
            // selected={makerData.status === "완료" ? true : false}
          >
            완료
          </option>

          <option
            value="실패"
            // selected={makerData.status === "실패" ? true : false}
          >
            실패
          </option>
        </select>
      </InfoWrapper>

      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          메모
        </Font>

        <textarea
          style={{ marginTop: "0.5rem" }}
          value={removeTags(duplicateMakerDataState?.memo || "")}
          onChange={(e) => {
            setDuplicateMakerDataState((prev) => {
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

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Button
          fontSize="14px"
          margin="4rem 0 0 0"
          backgroundColor="#5599FF"
          border="1px solid #5599FF"
          color="#fff"
          onClick={() => {
            if (duplicateMakerDataState) {
              duplicateMakerDataMutate({
                id: duplicateMakerDataState.id,
                patchData: duplicateMakerDataState,
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
