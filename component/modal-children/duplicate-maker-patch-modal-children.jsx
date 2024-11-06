import styled from 'styled-components';
import Line from '../line';
import Button from '../button';
import Font from '../font';
import { format } from 'date-fns';

const DuplicateMakerPatchModalChildren = ({
  duplicateMakerData, // 현재 중복 마커 state
  setDuplicateMakerData, // 중복 마커 setState
  duplicateMakerDataState, // patch > 중복 마커 state
  setDuplicateMakerDataState, // patch > 중복 마커 setState
  duplicateMakerDataMutate, // 중복 마커 patch API
  userId, // 현재 로그인 유저 아이디
}) => {
  const removeTags = (str) => {
    return str?.replace(/<\/?[^>]+(>|$)/g, '');
  };

  return (
    <>
      <Button
        margin="0 0 1rem 0"
        fontSize="14px"
        color="#000"
        padding="0.5rem"
        borderRadius="5px"
      >
        {`현재`}
      </Button>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          주주번호 :
        </Font>
        <Font fontSize="14px">{duplicateMakerData.shareholder_number}</Font>
      </InfoWrapper>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          이름 :
        </Font>
        <Font fontSize="14px">{duplicateMakerData.name}</Font>
      </InfoWrapper>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          주식수 :
        </Font>
        <Font fontSize="14px">{duplicateMakerData.stocks}</Font>
      </InfoWrapper>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          작년권리확정주식수 :
        </Font>
        <Font fontSize="14px">{duplicateMakerData.last_year_stocks}</Font>
      </InfoWrapper>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          주소 :
        </Font>
        <Font fontSize="14px" lineHeight={1.4}>
          {duplicateMakerData.address}
        </Font>
      </InfoWrapper>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          상태 :
        </Font>
        <Font fontSize="14px">{duplicateMakerData.status}</Font>
      </InfoWrapper>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          회사 :
        </Font>
        <Font fontSize="14px">{duplicateMakerData.company}</Font>
      </InfoWrapper>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          메모 :
        </Font>
        <Font fontSize="14px">{duplicateMakerData.memo}</Font>
      </InfoWrapper>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          변경이력 :
        </Font>

        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}
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
      </InfoWrapper>
      <Line margin="2rem 0 2rem 0" />
      <Button
        margin="0 0 1rem 0"
        fontSize="14px"
        color="#000"
        padding="0.5rem"
        borderRadius="5px"
      >
        {`수정`}
      </Button>
      <InfoWrapper>
        <Font fontSize="14px" whiteSpace="nowrap">
          상태 :
        </Font>

        <select
          name="status-select"
          id="status-select"
          value={duplicateMakerDataState?.status || ''}
          onChange={(e) => {
            setDuplicateMakerDataState((prev) => {
              if (!prev) {
                return { ...duplicateMakerData, status: e.target.value };
              } else {
                return {
                  ...prev,
                  status: e.target.value,
                };
              }
            });
          }}
        >
          <option
            value="선택"
            // selected={makerData.status === "" ? true : false}
          >
            선택하세요
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
          메모 :
        </Font>

        <textarea
          value={removeTags(duplicateMakerDataState?.memo || '')}
          onChange={(e) => {
            setDuplicateMakerDataState((prev) => {
              if (!prev) {
                return { ...duplicateMakerData, memo: e.target.value };
              } else {
                return {
                  ...prev,
                  memo: e.target.value,
                };
              }
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
          onClick={async () => {
            await duplicateMakerDataMutate(duplicateMakerDataState);
            setDuplicateMakerData(() => {
              return {
                ...duplicateMakerDataState,
                history: [
                  ...duplicateMakerDataState?.history,
                  `${userId} ${format(new Date(), 'yyyy/MM/dd/ HH:mm:ss')}`,
                ],
              };
            });
            setDuplicateMakerDataState(null);
          }}
        >
          수정하기
        </Button>
      </div>
    </>
  );
};

export default DuplicateMakerPatchModalChildren;

const InfoWrapper = styled.div`
  display: flex;
  margin-top: 0.5rem;
`;
