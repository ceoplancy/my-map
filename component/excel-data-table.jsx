import styled from 'styled-components';
import Font from './font';

const ExcelDataTable = ({ data }) => {
  return (
    <StyledTable>
      <tbody>
        <tr>
          <StyledTitleTd>주주번호</StyledTitleTd>
          <StyledContentTd>{data.id}</StyledContentTd>
        </tr>
        <tr>
          <StyledTitleTd>이름</StyledTitleTd>
          <StyledContentTd>{data.name}</StyledContentTd>
        </tr>
        <tr>
          <StyledTitleTd>주식수</StyledTitleTd>
          <StyledContentTd>{data.stocks}</StyledContentTd>
        </tr>
        <tr>
          <StyledTitleTd>주소</StyledTitleTd>
          <StyledContentTd lineHeight={1.4}>{data.address}</StyledContentTd>
        </tr>
        <tr>
          <StyledTitleTd>상태</StyledTitleTd>
          <StyledContentTd>{data.status}</StyledContentTd>
        </tr>
        <tr>
          <StyledTitleTd>회사명</StyledTitleTd>
          <StyledContentTd>{data.company}</StyledContentTd>
        </tr>
        <tr>
          <StyledTitleTd>메모</StyledTitleTd>
          <StyledContentTd>{data.memo}</StyledContentTd>
        </tr>
        <tr>
          <StyledTitleTd>변경이력</StyledTitleTd>
          <StyledContentTd>
            <HistoryContainer>
              {Array.isArray(data.history) &&
                data.history.map((x) => (
                  <Font key={x} fontSize="13px">
                    {x}
                  </Font>
                ))}
            </HistoryContainer>
          </StyledContentTd>
        </tr>
      </tbody>
    </StyledTable>
  );
};

export default ExcelDataTable;

const StyledTable = styled.table`
  border: 1px solid #ccc;
  border-collapse: collapse;
  width: 100%;
`;

const StyledTitleTd = styled.td`
  width: 40%;
  font-size: 13px;
  text-align: center;
  vertical-align: middle;
  border: 1px solid #ccc;
  padding: 10px;
  white-space: pre-wrap;
  line-height: ${(props) => (props.lineHeight ? props.lineHeight : 'normal')};
`;

const StyledContentTd = styled.td`
  width: 60%;
  font-size: 13px;
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
  vertical-align: middle;
  white-space: pre-wrap;
  line-height: ${(props) => (props.lineHeight ? props.lineHeight : 'normal')};
`;

const HistoryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;
