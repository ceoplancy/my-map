import styled from 'styled-components';
import Line from '../line';
import Button from '../button';
import Font from '../font';

const MakerPatchModalChildren = ({
  makerData, // 현재 마커 데이터
  patchDataState, // 수정할 마커 데이터 state
  setPatchDataState, // 수정할 마커 데이터 setState
  makerDataMutate, // 마커 수정 API
}) => {
  const removeTags = (str) => {
    return str?.replace(/<\/?[^>]+(>|$)/g, '');
  };

  return (
    <div style={{ width: '100%' }}>
      <table
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
              {makerData.id}
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
              {makerData.name}
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
              {makerData.stocks}
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
                lineHeight: 1.4,
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
              {makerData.address}
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
              {makerData.status}
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
              {makerData.company}
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
              {makerData.memo}
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
                {makerData?.history !== null &&
                  makerData?.history?.map((x) => {
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
      </table>

      <Line margin="2rem 0 2rem 0" />

      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="pre-wrap">
          상태
        </Font>

        <select
          style={{ marginTop: '0.5rem' }}
          name="status-select"
          id="status-select"
          value={patchDataState.status}
          onChange={(e) => {
            setPatchDataState((prev) => {
              return {
                ...prev,
                status: e.target.value,
              };
            });
          }}
        >
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
          style={{ marginTop: '0.5rem' }}
          value={removeTags(patchDataState.memo)}
          onChange={(e) => {
            setPatchDataState((prev) => {
              return {
                ...prev,
                memo: e.target.value,
              };
            });
          }}
        />
      </InfoWrapper>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          fontSize="14px"
          margin="4rem 0 0 0"
          backgroundColor="#5599FF"
          border="1px solid #5599FF"
          color="#fff"
          onClick={() => {
            makerDataMutate(patchDataState);
          }}
        >
          수정하기
        </Button>
      </div>
    </div>
  );
};

export default MakerPatchModalChildren;

const InfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 2rem;
`;
