import styled from "styled-components"
import Line from "../line"
import Button from "../button"
import Font from "../font"
import ExcelDataTable from "../excel-data-table"

const MakerPatchModalChildren = ({
  makerData, // 현재 마커 데이터
  patchDataState, // 수정할 마커 데이터 state
  setPatchDataState, // 수정할 마커 데이터 setState
  makerDataMutate, // 마커 수정 API
  setMakerDataUpdateIsModalOpen,
}) => {
  const removeTags = (str) => {
    return str?.replace(/<\/?[^>]+(>|$)/g, "")
  }

  return (
    <div style={{ width: "100%" }}>
      <ExcelDataTable data={makerData} />

      <Line margin="2rem 0 2rem 0" />

      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="pre-wrap">
          상태
        </Font>

        <select
          style={{ marginTop: "0.5rem" }}
          name="status-select"
          id="status-select"
          value={patchDataState.status}
          onChange={(e) => {
            setPatchDataState((prev) => {
              return {
                ...prev,
                status: e.target.value,
              }
            })
          }}>
          <option value="미방문">미방문</option>
          <option value="완료">완료</option>
          <option value="실패">실패</option>
        </select>
      </InfoWrapper>

      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="pre-wrap">
          메모
        </Font>

        <textarea
          style={{ marginTop: "0.5rem" }}
          value={removeTags(patchDataState.memo)}
          onChange={(e) => {
            setPatchDataState((prev) => {
              return {
                ...prev,
                memo: e.target.value,
              }
            })
          }}
        />
      </InfoWrapper>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <Button
          fontSize="14px"
          margin="4rem 0 0 0"
          backgroundColor="#5599FF"
          border="1px solid #5599FF"
          color="#fff"
          onClick={() => {
            makerDataMutate(patchDataState)
          }}>
          수정하기
        </Button>

        <Button
          fontSize="14px"
          margin="4rem 0 0 0"
          backgroundColor="#fff"
          border="1px solid #000"
          onClick={() => {
            setMakerDataUpdateIsModalOpen(false)
          }}>
          닫기
        </Button>
      </div>
    </div>
  )
}

export default MakerPatchModalChildren

const InfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 2rem;
`
