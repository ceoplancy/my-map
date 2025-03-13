import { useMap } from "react-kakao-maps-sdk"
import styled from "@emotion/styled"
import useDebounce from "@/hooks/useDebounce"
import { useEffect } from "react"
import { COLORS } from "@/styles/global-style"
import { Search as SearchIcon } from "@mui/icons-material"

// Kakao Maps API 관련 타입 정의
interface KakaoSearchResult {
  address_name: string
  x: string
  y: string
}

interface SearchAddressType {
  keyWord: string
  lat: number
  lng: number
}

interface SearchAddressBoundsProps {
  searchAddress: SearchAddressType
  setSearchAddress: React.Dispatch<React.SetStateAction<SearchAddressType>>
  isVisible: boolean
}

interface StyledProps {
  isVisible: boolean
}

const SearchAddressBounds: React.FC<SearchAddressBoundsProps> = ({
  searchAddress,
  setSearchAddress,
  isVisible,
}) => {
  const debouncedSearch = useDebounce<string>(searchAddress.keyWord, 500)
  const map = useMap()
  const geocoder = new kakao.maps.services.Geocoder()
  const ps = new kakao.maps.services.Places()
  const bounds = new kakao.maps.LatLngBounds()

  const onChangeSearchAddress = () => {
    const placesSearchCB = (
      data: KakaoSearchResult[],
      status: kakao.maps.services.Status,
    ) => {
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        setSearchAddress((prev) => ({
          ...prev,
          lat: Number(data[0].y),
          lng: Number(data[0].x),
        }))
      }
    }

    geocoder.addressSearch(
      debouncedSearch,
      (result: KakaoSearchResult[], status: kakao.maps.services.Status) => {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
          setSearchAddress((prev) => ({
            ...prev,
            lat: Number(result[0].y),
            lng: Number(result[0].x),
          }))
        } else {
          ps.keywordSearch(debouncedSearch, placesSearchCB)
        }
      },
    )
  }

  const onClickboundsData = () => {
    bounds.extend(new kakao.maps.LatLng(searchAddress.lat, searchAddress.lng))
    map.setBounds(bounds)
  }

  useEffect(() => {
    if (debouncedSearch !== "") {
      onChangeSearchAddress()
    }
  }, [debouncedSearch])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchAddress((prev) => ({
      ...prev,
      keyWord: e.target.value,
    }))
  }

  return (
    <SearchAddressWrapper isVisible={isVisible}>
      <SearchInputWrapper>
        <SearchIcon />
        <SearchInput
          type="text"
          placeholder="주소 또는 장소를 검색하세요"
          value={searchAddress.keyWord}
          onChange={handleInputChange}
        />
      </SearchInputWrapper>
      <SearchButton type="button" onClick={onClickboundsData}>
        검색
      </SearchButton>
    </SearchAddressWrapper>
  )
}

export default SearchAddressBounds

const SearchAddressWrapper = styled.div<StyledProps>`
  display: flex;
  gap: 8px;
  position: fixed;
  left: 20px;
  top: 80px;
  padding: 8px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  visibility: ${(props) => (props.isVisible ? "visible" : "hidden")};
  transform: translateY(${(props) => (props.isVisible ? "0" : "-10px")});
`

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 12px;
    color: ${COLORS.gray[400]};
    font-size: 20px;
  }
`

const SearchInput = styled.input`
  width: 240px;
  padding: 12px 12px 12px 40px;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: ${COLORS.gray[400]};
  }
`

const SearchButton = styled.button`
  padding: 12px 16px;
  background-color: ${COLORS.blue[500]};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${COLORS.blue[600]};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`
