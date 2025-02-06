import { useMap } from 'react-kakao-maps-sdk';
import Button from '@/component/button';
import styled from 'styled-components';
import useDebounce from '@/hooks/useDebounce';
import { useEffect } from 'react';

const SearchAddressBounds = ({ searchAddress, setSearchAddress }) => {
  const debouncedSearch = useDebounce(searchAddress.keyWord, 500);

  // 맵
  const map = useMap();
  // 주소로 검색 함수
  const geocoder = new kakao.maps.services.Geocoder();
  // 키워드로 검색 함수
  const ps = new kakao.maps.services.Places();
  // 바운스 함수
  const bounds = new kakao.maps.LatLngBounds();

  // 위도 경도 onChange
  const onChangeSearchAddress = () => {
    // 키워드로 검색 함수
    const placesSearchCB = (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        new kakao.maps.LatLngBounds();
        setSearchAddress((prev) => {
          return {
            ...prev,
            lat: data[0].y,
            lng: data[0].x,
          };
        });
      }
    };

    // 주소로 검색 함수
    geocoder.addressSearch(debouncedSearch, function (result, status) {
      if (status === kakao.maps.services.Status.OK) {
        setSearchAddress((prev) => {
          return {
            ...prev,
            lat: result[0].y,
            lng: result[0].x,
          };
        });
      } else {
        ps.keywordSearch(debouncedSearch, placesSearchCB);
      }
    });
  };

  // 디바운스 클릭 이벤트
  const onClickboundsData = () => {
    const boundsData = bounds.extend(
      new kakao.maps.LatLng(searchAddress.lat, searchAddress.lng)
    );
    map.setBounds(boundsData);
  };

  // 디바운스 객체가(검색어 onChange 0.5초 늦게적용) 바뀔 때마다 위도 경도 API 호출
  useEffect(() => {
    if (debouncedSearch !== '') {
      onChangeSearchAddress();
    }
  }, [debouncedSearch]);

  return (
    <SearchAddressWrapper>
      <input
        style={{ width: '70px' }}
        type="text"
        placeholder="주소검색"
        onChange={(e) => {
          setSearchAddress((prev) => {
            return { ...prev, keyWord: e.target.value };
          });
        }}
      />

      <Button
        fontSize="13px"
        backgroundColor="#5599FF"
        border="1px solid #5599FF"
        borderRadius="5px"
        color="#fff"
        padding="5px"
        onClick={() => onClickboundsData()}
      >
        검색
      </Button>
    </SearchAddressWrapper>
  );
};

export default SearchAddressBounds;

const SearchAddressWrapper = styled.div`
  display: flex;
  gap: 10px;

  position: fixed;
  left: 20px;
  top: 212px;

  @media (max-width: 768px) {
    left: 20px;
    top: 200px;
  }

  height: 40px;
  padding: 7px;
  border: 1px #000 solid;
  border-radius: 5px;
  background-color: #fff;
  z-index: 5;
  cursor: pointer;
`;
