import React from 'react';
import { MapMarker } from 'react-kakao-maps-sdk';
import styled from 'styled-components';

const MultipleMapMaker = ({ markers }) => {
  if (!markers.length) return null;

  return (
    <Frame>
      <MapMarker
        position={{
          lat: markers[0].lat,
          lng: markers[0].lng,
        }}
        clickable={true}
        onClick={() => alert('해당 영역으로 확대하면 마커가 나타납니다.')}
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
