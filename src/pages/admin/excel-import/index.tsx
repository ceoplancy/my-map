import { ChangeEventHandler, FormEvent, useState } from "react"
import * as XLSX from "xlsx"
import supabase from "@/lib/supabase/supabaseClient"
import { toast } from "react-toastify"
import { ExcelImportView } from "@/components/excel-import/ExcelImportView"
import { useExcelImport } from "@/hooks/useExcelImport"
import { useKakaoMaps } from "@/hooks/useKakaoMaps"
import { Excel } from "@/types/excel"

import AdminLayout from "@/layouts/AdminLayout"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"

interface GeocodingResult {
  success: boolean
  data?: Excel
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, white, #f8fafc);
  padding: 2rem;
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1f2937, #4b5563);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

export const BATCH_SIZE = 50

const ExcelImport = () => {
  const {
    failData,
    setFailData,
    failCount,
    setFailCount,
    excelFile,
    setExcelFile,
    fileName,
    setFileName,
    loading,
    setLoading,
    progress,
    setProgress,
  } = useExcelImport()

  const { waitForKakaoMaps } = useKakaoMaps()

  const [processingItem, setProcessingItem] = useState<number | null>(null)

  const handleFile: ChangeEventHandler<HTMLInputElement> = (e) => {
    const fileTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ]

    if (!e.target.files?.length) {
      console.info("Please select your file")

      return
    }

    const selectedFile = e.target.files[0]

    if (!fileTypes.includes(selectedFile.type)) {
      toast.error("Please select only excel file types")
      clearFileName()

      return
    }

    setFileName(selectedFile.name)
    const reader = new FileReader()
    reader.readAsArrayBuffer(selectedFile)
    reader.onload = (e) => setExcelFile(e.target?.result as ArrayBuffer)
  }

  const clearFileName = (): void => {
    setFileName("")
    setExcelFile(null)
  }

  const handleExport = (): void => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(convertToExportArray(failData))
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })

    downloadFile(blob, "주소변환실패현황.xlsx")
  }

  const downloadFile = (blob: Blob, fileName: string): void => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const convertToExportArray = (arr: any[]): any[][] => {
    if (!arr.length) return []

    const headers = Object.keys(arr[0])

    return [
      headers,
      ...arr.map((item) => headers.map((header) => item[header])),
    ]
  }

  const handleGeocoding = async (
    geocoder: any,
    excel: Excel,
  ): Promise<GeocodingResult> => {
    return new Promise((resolve) => {
      geocoder.addressSearch(excel.address, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK) {
          resolve({
            success: true,
            data: {
              ...excel,
              lat: result[0].y.toString(),
              lng: result[0].x.toString(),
              stocks: excel.stocks || 0,
            },
          })
        } else {
          setFailData((prev) => [...prev, excel])
          setFailCount((prev) => prev + 1)
          resolve({ success: false })
        }
      })
    })
  }

  const processBatch = async (
    excels: Excel[],
    geocoder: any,
  ): Promise<Excel[]> => {
    const results = await Promise.all(
      excels.map(async (excel) => {
        const result = await handleGeocoding(geocoder, excel)

        return result
      }),
    )

    return results
      .filter((r): r is Required<GeocodingResult> => r.success && !!r.data)
      .map((r) => r.data)
  }

  const handleFileSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault()
    if (!excelFile) return

    setLoading(true)
    setFailData([])
    setFailCount(0)

    try {
      await waitForKakaoMaps()

      const workbook = XLSX.read(excelFile, { type: "buffer" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet)

      const totalRows = data.length

      setProgress({ current: 0, total: totalRows })

      const geocoder = new window.kakao.maps.services.Geocoder()
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE)

      let allResults: Excel[] = []
      let processedRows = 0

      for (let i = 0; i < totalBatches; i++) {
        const batch = data.slice(
          i * BATCH_SIZE,
          (i + 1) * BATCH_SIZE,
        ) as Excel[]
        const batchResults = await processBatch(batch, geocoder)
        allResults = [...allResults, ...batchResults]

        processedRows += batch.length
        setProgress((prev) => ({ ...prev, current: processedRows }))

        if (i < totalBatches - 1) {
          await new Promise((r) => setTimeout(r, 3000))
        }
      }

      if (allResults.length > 0) {
        const { error } = await supabase
          .from("excel")
          .upsert(allResults)
          .select()

        if (error) {
          toast.error(`데이터 업로드 중 오류가 발생했습니다. ${error.message}`)
          throw error
        }

        toast.success(
          `${data.length}개의 데이터가 성공적으로 업로드되었습니다.`,
        )
      }

      if (allResults.length !== totalRows) {
        toast.warning(
          "일부 주소 변환에 실패했습니다. 실패한 주소는 아래 목록에서 확인할 수 있습니다.",
        )
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("주소 변환에 실패하였습니다. 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  // 실패 데이터 수정 및 재변환 함수
  const handleEditFailedData = async (editedData: Excel): Promise<void> => {
    setLoading(true)
    try {
      await waitForKakaoMaps()
      const geocoder = new window.kakao.maps.services.Geocoder()

      const result = await handleGeocoding(geocoder, editedData)

      if (result.success && result.data) {
        // 성공한 경우 DB에 저장
        await supabase.from("excel").insert([result.data]).select()

        // 실패 데이터 목록에서 제거
        setFailData(
          failData.filter(
            (item) => item.latlngaddress !== editedData.latlngaddress,
          ),
        )
        setFailCount((prev) => prev - 1)

        toast.success("데이터가 성공적으로 변환되어 업로드되었습니다.")
      } else {
        // 여전히 실패한 경우 실패 데이터 업데이트
        setFailData(
          failData.map((item) =>
            item.latlngaddress === editedData.latlngaddress ? editedData : item,
          ),
        )

        toast.error("주소 변환에 실패했습니다. 다른 주소로 시도해보세요.")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("데이터 처리 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 모든 실패 데이터 재시도 함수
  const handleRetryAllFailedData = async (): Promise<void> => {
    if (failData.length === 0) return

    setLoading(true)
    try {
      await waitForKakaoMaps()
      const geocoder = new window.kakao.maps.services.Geocoder()

      const totalItems = failData.length
      setProgress({ current: 0, total: totalItems })

      let successCount = 0
      let newFailData = [...failData]

      for (let i = 0; i < totalItems; i++) {
        setProgress({ current: i + 1, total: totalItems })
        setProcessingItem(i)

        const result = await handleGeocoding(geocoder, failData[i])

        if (result.success && result.data) {
          // 성공한 경우 DB에 저장
          await supabase.from("excel").insert([result.data]).select()

          // 성공 항목 표시
          newFailData = newFailData.filter(
            (_, index) => index !== i - successCount,
          )
          successCount++

          // 다음 요청 전 잠시 대기
          await new Promise((r) => setTimeout(r, 1000))
        }
      }

      // 실패 데이터 업데이트
      setFailData(newFailData)
      setFailCount(newFailData.length)

      if (successCount > 0) {
        toast.success(
          `${successCount}개의 데이터가 성공적으로 변환되어 업로드되었습니다.`,
        )
      }

      if (newFailData.length > 0) {
        toast.warning(
          `${newFailData.length}개의 데이터는 여전히 변환에 실패했습니다.`,
        )
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("데이터 처리 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
      setProcessingItem(null)
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files?.length) {
      const file = e.dataTransfer.files[0]
      const fileTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ]

      if (!fileTypes.includes(file.type)) {
        toast.error("엑셀 파일 형식만 업로드 가능합니다")
        clearFileName()

        return
      }

      setFileName(file.name)
      const reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = (e) => setExcelFile(e.target?.result as ArrayBuffer)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <AdminLayout>
      <Container>
        <Header>
          <Title>엑셀 업로드</Title>
        </Header>
        <ExcelImportView
          fileName={fileName}
          failCount={failCount}
          failData={failData}
          loading={loading}
          progress={progress}
          onFileChange={handleFile}
          onClearFileName={clearFileName}
          onSubmit={handleFileSubmit}
          onExport={handleExport}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onEditFailedData={handleEditFailedData}
          onRetryAllFailedData={handleRetryAllFailedData}
        />
      </Container>
    </AdminLayout>
  )
}

export default ExcelImport
