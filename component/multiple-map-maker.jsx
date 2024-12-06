import React from 'react';
import { MapMarker } from 'react-kakao-maps-sdk';
import styled from 'styled-components';

const MultipleMapMaker = ({ markers }) => {
  if (!markers.length) return null; // 마커가 없을 경우 아무것도 렌더링하지 않음

  const { lat, lng } = markers[0]; // 첫 번째 데이터에서 위도와 경도 추출

  return (
    <Frame>
      <MapMarker
        position={{ lat, lng }}
        clickable={true}
        onClick={() => alert('해당 구역으로 확대하면 마커가 나타납니다.')}
        image={{
          src: `/svg/maker1.svg`,
          size: {
            width: 30,
            height: 40,
          },
        }}
      />
    </Frame>
  );
};

export default MultipleMapMaker;

const Frame = styled.div``;

const SpinnerFrame = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.5);
`;
