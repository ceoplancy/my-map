import React from 'react';
import { MapMarker, useMap } from 'react-kakao-maps-sdk';
import styled from 'styled-components';

const MultipleMapMaker = ({ markers }) => {
  const map = useMap();
  console.log(markers);

  const onClickboundsData = () => {
    const bounds = new kakao.maps.LatLngBounds();

    if (Array.isArray(markers)) {
      markers.forEach((point) => {
        bounds.extend(new kakao.maps.LatLng(point.lat, point.lng));
      });
    }

    map.setBounds(bounds);
  };

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
        // onClick={() => onClickboundsData()}
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
