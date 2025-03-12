import styled from "styled-components"
import Line from "../line"
import Button from "../button"
import Font from "../font"
import ExcelDataTable from "../excel-data-table"
import { Excel } from "@/types/excel"
import { Dispatch, SetStateAction } from "react"
import { UseMutateFunction } from "react-query"
import { useFormik } from "formik"

interface MakerPatchModalChildrenProps {
  makerData: Excel
  makerDataMutate: UseMutateFunction<
    void,
    unknown,
    {
      id: number
      patchData: Excel
    },
    unknown
  >
  setMakerDataUpdateIsModalOpen: Dispatch<SetStateAction<boolean>>
}

const MakerPatchModalChildren = ({
  makerData, // 현재 마커 데이터
  makerDataMutate, // 마커 수정 API
  setMakerDataUpdateIsModalOpen,
}: MakerPatchModalChildrenProps) => {
  const formik = useFormik({
    initialValues: makerData,
    onSubmit: (values) => {
      console.log(values)
      makerDataMutate({
        id: makerData.id,
        patchData: values,
      })
    },
  })

  console.log(formik)
  const removeTags = (str: string) => {
    return str?.replace(/<\/?[^>]+(>|$)/g, "")
  }

  return (
    <div style={{ width: "100%" }}>
      <ExcelDataTable data={makerData} />

      <Line margin="2rem 0 2rem 0" />

      <form onSubmit={formik.handleSubmit}>
        <InfoWrapper>
          <Font fontSize="14px" whiteSpace="pre-wrap">
            상태
          </Font>

          {formik.values.status ? (
            <select
              style={{ marginTop: "0.5rem" }}
              name="status"
              id="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}>
              <option value="미방문">미방문</option>
              <option value="완료">완료</option>
              <option value="실패">실패</option>
            </select>
          ) : (
            <Font $size={12} whiteSpace="pre-wrap" margin="1rem 0 0 0">
              상태 정보가 존재하지 않습니다. 관리자에게 문의하세요.
            </Font>
          )}
        </InfoWrapper>

        <InfoWrapper>
          <Font fontSize="14px" whiteSpace="pre-wrap">
            메모
          </Font>

          <textarea
            style={{ marginTop: "0.5rem" }}
            name="memo"
            value={removeTags(formik.values.memo || "")}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
        </InfoWrapper>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Button
            type="submit"
            fontSize="14px"
            margin="4rem 0 0 0"
            backgroundColor="#5599FF"
            border="1px solid #5599FF"
            color="#fff">
            수정하기
          </Button>

          <Button
            type="button"
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
      </form>
    </div>
  )
}

export default MakerPatchModalChildren

const InfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 2rem;
`
