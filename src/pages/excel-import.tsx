import { ChangeEventHandler, FormEvent } from "react"
import * as XLSX from "xlsx"
import supabase from "@/lib/supabase/supabaseClient"
import { toast } from "react-toastify"
import { ExcelImportView } from "@/components/excel-import/ExcelImportView"
import { useExcelImport } from "@/hooks/useExcelImport"
import { useKakaoMaps } from "@/hooks/useKakaoMaps"
import { Excel } from "@/types/excel"

interface GeocodingResult {
  success: boolean
  data?: Excel
}

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
      geocoder.addressSearch(
        excel.latlngaddress,
        (result: any[], status: string) => {
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
        },
      )
    })
  }

  const processBatch = async (
    excels: Excel[],
    geocoder: any,
  ): Promise<Excel[]> => {
    const results = await Promise.all(
      excels.map((excel) => handleGeocoding(geocoder, excel)),
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
    try {
      await waitForKakaoMaps()

      const workbook = XLSX.read(excelFile, { type: "buffer" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet)

      const geocoder = new window.kakao.maps.services.Geocoder()
      const batchSize = 10
      const totalBatches = Math.ceil(data.length / batchSize)
      setProgress({ current: 0, total: totalBatches })

      let allResults: Excel[] = []
      for (let i = 0; i < totalBatches; i++) {
        const batch = data.slice(i * batchSize, (i + 1) * batchSize) as Excel[]
        const batchResults = await processBatch(batch, geocoder)
        allResults = [...allResults, ...batchResults]

        setProgress((prev) => ({ ...prev, current: i + 1 }))
        if (i < totalBatches - 1) await new Promise((r) => setTimeout(r, 3000))
      }

      if (allResults.length > 0) {
        await supabase.from("excel").insert(allResults).select()
        toast.success(
          `${allResults.length}개의 데이터가 성공적으로 업로드되었습니다.`,
        )
      }

      if (allResults.length !== data.length) {
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

  return (
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
    />
  )
}

export default ExcelImport
