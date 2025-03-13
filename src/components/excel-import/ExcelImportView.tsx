import React, {
  FormEvent,
  ChangeEventHandler,
  useState,
  useEffect,
  useRef,
} from "react"
import {
  Box,
  Button,
  Container,
  Typography,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Chip,
  Divider,
  useTheme,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  InputAdornment,
  Grid,
  ListItemButton,
} from "@mui/material"
import {
  CloudUpload,
  Clear,
  FileDownload,
  CheckCircle,
  Error as ErrorIcon,
  Edit,
  Save,
  Search,
  LocationOn,
  Map as MapIcon,
} from "@mui/icons-material"
import { Excel } from "@/types/excel"
import useDebounce from "@/hooks/useDebounce"
import { FIELD_LABELS } from "../admin/shareholders/EditShareholderModal"

// Excel 타입을 확장하여 인덱스 시그니처 추가

export type SearchResult = {
  address_name: string
  road_address_name: string
  place_name: string
  x: number
  y: number
  address: string
  road_address: string
  place: string
  lat: number
  lng: number
}

interface ExcelImportViewProps {
  fileName: string
  failCount: number
  failData: Excel[]
  loading: boolean
  progress: { current: number; total: number }
  onFileChange: ChangeEventHandler<HTMLInputElement>
  onClearFileName: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>
  onExport: (data: Excel[]) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void
  onEditFailedData: (editedData: Excel) => Promise<void>
  onRetryAllFailedData: () => Promise<void>
}

export const ExcelImportView: React.FC<ExcelImportViewProps> = ({
  fileName,
  failCount,
  failData,
  loading,
  progress,
  onFileChange,
  onClearFileName,
  onSubmit,
  onExport,
  onDrop,
  onDragOver,
  onDragEnter,
  onEditFailedData,
  onRetryAllFailedData,
}) => {
  const theme = useTheme()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentEditData, setCurrentEditData] = useState<Excel | null>(null)
  const [editedValues, setEditedValues] = useState<Record<string, any>>({})

  // 주소 검색 관련 상태
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [addressValid, setAddressValid] = useState(false)

  // 지도 관련 상태
  const [mapVisible, setMapVisible] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const kakaoMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  // 디바운스 적용
  const debouncedSearch = useDebounce(searchKeyword, 500)

  // 페이지네이션 관련 상태 추가
  const [page, setPage] = useState(0)
  const [rowsPerPage] = useState(20)

  // 지도 초기화 함수
  const initializeMap = (lat?: number, lng?: number) => {
    if (!mapRef.current || !window.kakao || !window.kakao.maps) return

    const options = {
      center: new window.kakao.maps.LatLng(
        lat || 37.566826,
        lng || 126.9786567,
      ),
      level: 3,
    }

    // 지도 생성
    const map = new window.kakao.maps.Map(mapRef.current, options)
    kakaoMapRef.current = map

    // 마커 생성
    if (lat && lng) {
      const markerPosition = new window.kakao.maps.LatLng(lat, lng)
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
      })
      marker.setMap(map)
      markerRef.current = marker
    }
  }

  // 마커 업데이트 함수
  const updateMarker = (lat: number, lng: number) => {
    if (!kakaoMapRef.current) return

    const position = new window.kakao.maps.LatLng(lat, lng)

    // 기존 마커가 있으면 제거
    if (markerRef.current) {
      markerRef.current.setMap(null)
    }

    // 새 마커 생성
    const marker = new window.kakao.maps.Marker({
      position: position,
    })
    marker.setMap(kakaoMapRef.current)
    markerRef.current = marker

    // 지도 중심 이동
    kakaoMapRef.current.setCenter(position)
  }

  // 지도 가시성 변경 시 처리 - 수정
  useEffect(() => {
    if (mapVisible && editDialogOpen) {
      // 약간의 지연을 두고 지도 초기화 (DOM이 완전히 렌더링된 후)
      setTimeout(() => {
        const lat = selectedLocation?.lat || currentEditData?.lat
        const lng = selectedLocation?.lng || currentEditData?.lng
        if (lat && lng) {
          initializeMap(Number(lat), Number(lng))
        } else {
          // 좌표가 없는 경우 기본 위치로 초기화
          initializeMap(37.566826, 126.9786567)
        }
      }, 300)
    }
  }, [mapVisible])

  // 다이얼로그 열릴 때 지도 초기화 - 수정
  useEffect(() => {
    if (editDialogOpen && mapVisible) {
      // 약간의 지연을 두고 지도 초기화 (DOM이 완전히 렌더링된 후)
      setTimeout(() => {
        const lat = currentEditData?.lat || selectedLocation?.lat
        const lng = currentEditData?.lng || selectedLocation?.lng
        if (lat && lng) {
          initializeMap(Number(lat), Number(lng))
        } else {
          // 좌표가 없는 경우 기본 위치로 초기화
          initializeMap(37.566826, 126.9786567)
        }
      }, 300) // 지연 시간 증가
    }
  }, [editDialogOpen, mapVisible])

  // 디바운스된 검색어 변경 시 주소 검색
  useEffect(() => {
    if (debouncedSearch) {
      searchAddress(debouncedSearch)
    }
  }, [debouncedSearch])

  // 주소 검색 함수
  const searchAddress = (keyword: string) => {
    if (!keyword || keyword.trim() === "") {
      setSearchResults([])

      return
    }

    setSearchLoading(true)

    try {
      // 카카오맵 API가 로드되었는지 확인
      if (window.kakao && window.kakao.maps) {
        const geocoder = new window.kakao.maps.services.Geocoder()
        const places = new window.kakao.maps.services.Places()

        // 주소 검색 시도
        geocoder.addressSearch(keyword, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK) {
            setSearchResults(result)
            setSearchLoading(false)
          } else {
            // 주소 검색 실패 시 키워드 검색 시도
            places.keywordSearch(keyword, (data: any[], status: string) => {
              if (status === window.kakao.maps.services.Status.OK) {
                setSearchResults(data)
              } else {
                setSearchResults([])
              }
              setSearchLoading(false)
            })
          }
        })
      } else {
        console.error("Kakao Maps API is not loaded")
        setSearchLoading(false)
      }
    } catch (error) {
      console.error("Error searching address:", error)
      setSearchLoading(false)
    }
  }

  // 주소 선택 처리 함수
  const handleSelectAddress = (item: any) => {
    // 사용자에게 보여줄 주소 (도로명 주소 우선, 없으면 지번 주소)
    const displayAddress =
      item.road_address_name || item.address_name || item.place_name

    // 실제 저장할 주소 데이터 (원본 주소 값)
    const originalAddress = item.address_name

    // 검색 결과 표시 업데이트
    setSearchKeyword(displayAddress)

    // 실제 데이터는 원본 주소로 저장
    handleInputChange("address", originalAddress)

    // 위도, 경도 업데이트
    if (item.y && item.x) {
      handleInputChange("lat", item.y)
      handleInputChange("lng", item.x)
      setSelectedLocation({ lat: item.y, lng: item.x })
      updateMarker(item.y, item.x)
    }

    setAddressValid(true)
    setSearchResults([])
  }

  // 편집 다이얼로그 열기 함수
  const handleEditClick = (rowData: Excel) => {
    console.info(rowData)
    setCurrentEditData(rowData)

    // 모든 필드를 포함하는 초기 값 설정
    // 기본 필드 목록 정의 (필요에 따라 조정)
    const allFields: (keyof Excel)[] = [
      "id",
      "name",
      "address",
      "status",
      "company",
      "maker",
      "memo",
      "stocks",
    ]

    // 초기값 설정 (rowData에 있는 값 + 없는 필드는 빈 문자열)
    const initialValues: Excel = rowData

    allFields.forEach((field) => {
      switch (field) {
        case "history":
          initialValues[field] = rowData[field] || []
          break
        case "id":
        case "lat":
        case "lng":
        case "stocks":
          initialValues[field] = rowData[field] || 0
          break
        case "name":
        case "status":
        case "company":
        case "address":
        case "maker":
        case "memo":
        case "latlngaddress":
          initialValues[field] = rowData[field] || ""
          break
        default:
          initialValues[field] = rowData[field]
          break
      }
    })

    setEditedValues(initialValues)

    setSearchKeyword(rowData["address"] || "")

    // 위도, 경도 설정
    const lat = rowData.lat || 0
    const lng = rowData.lng || 0
    if (lat && lng) {
      setSelectedLocation({ lat, lng })
      setAddressValid(true)
    } else {
      setSelectedLocation(null)
      setAddressValid(false)
    }

    setEditDialogOpen(true)
  }

  // 다이얼로그 닫기 함수
  const handleEditDialogClose = () => {
    setEditDialogOpen(false)
    setCurrentEditData(null)
    setEditedValues({})
    setSearchKeyword("")
    setSearchResults([])
    setAddressValid(false)
  }

  // 입력 필드 변경 처리 함수
  const handleInputChange = (field: string, value: any) => {
    setEditedValues((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // 수정 저장 함수
  const handleSaveEdit = async () => {
    if (currentEditData && editedValues) {
      try {
        // 수정된 데이터 저장
        await onEditFailedData({
          ...currentEditData,
          ...editedValues,
        })

        // 다이얼로그 닫기
        handleEditDialogClose()
      } catch (error) {
        console.error("Error saving edited data:", error)
      }
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          mb: 4,
        }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          fontWeight="bold"
          color="primary">
          엑셀 데이터 임포트
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          엑셀 파일을 업로드하여 주소 데이터를 위도/경도 좌표로 변환합니다.
        </Typography>

        <form onSubmit={onSubmit}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              p: 3,
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.default",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "action.hover",
              },
            }}
            onClick={() => document.getElementById("file-upload")?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}>
            <input
              type="file"
              id="file-upload"
              accept=".xlsx, .xls"
              onChange={onFileChange}
              style={{ display: "none" }}
            />

            {fileName ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}>
                <Chip
                  label={fileName}
                  color="primary"
                  onDelete={onClearFileName}
                  deleteIcon={<Clear />}
                  sx={{ maxWidth: "100%", overflow: "hidden" }}
                />
              </Box>
            ) : (
              <>
                <CloudUpload
                  color="primary"
                  sx={{ fontSize: 48, mb: 2, opacity: 0.7 }}
                />
                <Typography variant="h6" color="textSecondary" align="center">
                  파일을 드래그하거나 클릭하여 업로드
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  align="center"
                  sx={{ mt: 1 }}>
                  지원 형식: .xlsx, .xls
                </Typography>
              </>
            )}

            <label htmlFor="file-upload">
              <Button
                component="span"
                variant="contained"
                color="primary"
                startIcon={<CloudUpload />}
                sx={{ mt: 3 }}
                disabled={loading}>
                파일 선택
              </Button>
            </label>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 3,
              gap: 2,
            }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!fileName || loading}
              sx={{ minWidth: 120 }}>
              변환 시작
            </Button>

            {failCount > 0 && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={onRetryAllFailedData}
                disabled={loading}
                sx={{ minWidth: 120 }}>
                모두 재시도
              </Button>
            )}
          </Box>
        </form>

        {loading && (
          <Box sx={{ mt: 4 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}>
              <Typography variant="body2" color="textSecondary">
                변환 진행 중...
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {progress.current} / {progress.total}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(progress.current / progress.total) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
      </Paper>

      {/* 데이터 수정 다이얼로그 - 지도 추가 */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        maxWidth="lg"
        fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            주소 데이터 수정
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            주소 정보를 수정하여 다시 변환을 시도합니다. 정확한 주소를 입력하면
            변환 성공률이 높아집니다.
          </Typography>

          <Grid container spacing={3}>
            {/* 왼쪽: 입력 폼 */}
            <Grid item xs={12} md={6}>
              <Box sx={{ mt: 2 }}>
                {editedValues &&
                  Object.keys(editedValues).map((field) => {
                    // 주소 필드인 경우 검색 기능 추가
                    if (field === "address") {
                      return (
                        <Box key={field} sx={{ position: "relative" }}>
                          <TextField
                            label={field}
                            fullWidth
                            margin="normal"
                            value={searchKeyword}
                            onChange={(e) => {
                              setSearchKeyword(e.target.value)
                              setAddressValid(false)
                            }}
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Search color="action" />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <InputAdornment position="end">
                                  {searchLoading ? (
                                    <CircularProgress size={20} />
                                  ) : addressValid ? (
                                    <CheckCircle color="success" />
                                  ) : null}
                                </InputAdornment>
                              ),
                            }}
                            error={!addressValid && searchKeyword !== ""}
                            helperText={
                              !addressValid && searchKeyword !== ""
                                ? "유효한 주소를 선택해주세요"
                                : ""
                            }
                          />

                          {/* 주소 검색 결과 */}
                          {searchResults.length > 0 && !addressValid && (
                            <Paper
                              elevation={3}
                              sx={{
                                position: "absolute",
                                width: "100%",
                                maxHeight: 200,
                                overflow: "auto",
                                zIndex: 10,
                                mt: 1,
                              }}>
                              <List dense>
                                {searchResults.map((item, idx) => (
                                  <ListItemButton
                                    key={idx}
                                    onClick={() => handleSelectAddress(item)}
                                    sx={{
                                      "&:hover": {
                                        backgroundColor: "action.hover",
                                      },
                                    }}>
                                    <LocationOn
                                      color="primary"
                                      sx={{ mr: 1, fontSize: 20 }}
                                    />
                                    <ListItemText
                                      primary={
                                        item.place_name ||
                                        item.road_address_name ||
                                        item.address_name
                                      }
                                      secondary={item.address_name}
                                    />
                                  </ListItemButton>
                                ))}
                              </List>
                            </Paper>
                          )}
                        </Box>
                      )
                    }

                    // 위도, 경도, latlngaddress, stocks, name, id 필드는 읽기 전용으로 표시
                    if (
                      field === "lat" ||
                      field === "lng" ||
                      field === "latlngaddress" ||
                      field === "stocks" ||
                      field === "name" ||
                      field === "id"
                    ) {
                      return (
                        <TextField
                          key={field}
                          label={FIELD_LABELS[field as keyof Excel]}
                          fullWidth
                          margin="normal"
                          value={editedValues[field] || ""}
                          variant="outlined"
                          InputLabelProps={{ shrink: true }}
                          disabled
                        />
                      )
                    }

                    // 다른 필드는 일반 텍스트 필드로 표시
                    return (
                      <TextField
                        key={field}
                        label={FIELD_LABELS[field as keyof Excel]}
                        fullWidth
                        margin="normal"
                        value={editedValues[field] || ""}
                        onChange={(e) =>
                          handleInputChange(field, e.target.value)
                        }
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                      />
                    )
                  })}
              </Box>
            </Grid>

            {/* 오른쪽: 지도 */}
            <Grid item xs={12} md={6}>
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    <MapIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                    위치 확인
                  </Typography>
                  <Chip
                    label={mapVisible ? "지도 숨기기" : "지도 보기"}
                    color="primary"
                    variant="outlined"
                    onClick={() => setMapVisible(!mapVisible)}
                  />
                </Box>

                {mapVisible && (
                  <Box
                    ref={mapRef}
                    sx={{
                      width: "100%",
                      height: 400,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      overflow: "hidden",
                    }}
                  />
                )}

                <Alert severity="info" sx={{ mt: 2 }}>
                  주소 수정은 검색 결과에서 선택된 주소만 설정할 수 있습니다.
                  정확한 주소를 검색하고 목록에서 선택해주세요.
                </Alert>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose} color="inherit">
            취소
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            color="primary"
            startIcon={<Save />}
            disabled={!addressValid}>
            저장 및 재변환
          </Button>
        </DialogActions>
      </Dialog>

      {failCount > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}>
            <Typography variant="h6" fontWeight="bold" color="error">
              변환 실패 데이터 ({failCount}건)
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FileDownload />}
              onClick={() => onExport(failData)}
              size="small">
              엑셀 파일 다운로드
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 1 }}>
            아래 데이터는 주소를 좌표로 변환하는데 실패했습니다. 하단의 작업
            버튼을 통해 주소를 수정한 후 저장 및 재변환을 시도해주세요.
          </Alert>

          <Alert severity="error" sx={{ mb: 3 }}>
            새로 고침 시 수정 중인 데이터 목록은 사라집니다.
          </Alert>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                  <TableCell>ID</TableCell>
                  <TableCell>이름</TableCell>
                  <TableCell>주소</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell width={100} align="center">
                    작업
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {failData
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.id || index + 1}</TableCell>
                      <TableCell>{row.name || "-"}</TableCell>
                      <TableCell>{row.address || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<ErrorIcon fontSize="small" />}
                          label="변환 실패"
                          color="error"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="데이터 수정">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditClick(row)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 페이지네이션 추가 */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              총 {failCount}건 중 {page * rowsPerPage + 1}-
              {Math.min((page + 1) * rowsPerPage, failCount)}건
            </Typography>
            <Button
              size="small"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              sx={{ mr: 1 }}>
              이전
            </Button>
            <Button
              size="small"
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * rowsPerPage >= failCount}>
              다음
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  )
}
