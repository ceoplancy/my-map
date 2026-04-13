import { ChangeEventHandler, FormEvent, useEffect, useState } from "react"
import * as XLSX from "xlsx"
import supabase from "@/lib/supabase/supabaseClient"
import { toast } from "react-toastify"
import { ExcelImportView } from "@/components/excel-import/ExcelImportView"
import { useExcelImport } from "@/hooks/useExcelImport"
import { useKakaoMaps } from "@/hooks/useKakaoMaps"
import { Excel } from "@/types/excel"
import {
  coerceSheetRowToExcel,
  createDeferredFailure,
  DeferredFailure,
  geocodeExcelRow,
  loadPreserveQueuePref,
  mergeDeferredLists,
  savePreserveQueuePref,
} from "@/lib/excelImportDeferred"

import AdminLayout from "@/layouts/AdminLayout"
import styled from "@emotion/styled"
import * as Sentry from "@sentry/nextjs"

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

  const [preserveQueueBeforeUpload, setPreserveQueueBeforeUpload] =
    useState(true)

  useEffect(() => {
    const pref = loadPreserveQueuePref()
    if (pref !== null) {
      setPreserveQueueBeforeUpload(pref)
    }
  }, [])

  const handlePreserveQueueChange = (next: boolean) => {
    setPreserveQueueBeforeUpload(next)
    savePreserveQueuePref(next)
  }

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
      toast.error("오직 엑셀 파일만 업로드 가능합니다.")
      clearFileName()

      return
    }

    setFileName(selectedFile.name)
    const reader = new FileReader()
    reader.readAsArrayBuffer(selectedFile)
    reader.onload = (ev) => setExcelFile(ev.target?.result as ArrayBuffer)
  }

  const clearFileName = (): void => {
    setFileName("")
    setExcelFile(null)
  }

  const handleExport = (data: DeferredFailure[]): void => {
    const rows = data.map((d) => d.excel)
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(convertToExportArray(rows))
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })

    downloadFile(blob, "주소변환실패현황.xlsx")
  }

  const downloadFile = (blob: Blob, downloadName: string): void => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = downloadName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const convertToExportArray = (
    arr: Record<string, unknown>[],
  ): unknown[][] => {
    if (!arr.length) return []

    const headers = Object.keys(arr[0])

    return [
      headers,
      ...arr.map((item) => headers.map((header) => item[header])),
    ]
  }

  const handleFileSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault()
    if (!excelFile) return

    setLoading(true)

    if (!preserveQueueBeforeUpload) {
      setFailData([])
    }

    try {
      await waitForKakaoMaps()

      const workbook = XLSX.read(excelFile, { type: "buffer" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rawRows =
        XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)
      const rows = rawRows.map(coerceSheetRowToExcel)

      const totalRows = rows.length

      setProgress({ current: 0, total: totalRows })

      const geocoder = new window.kakao.maps.services.Geocoder()
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE)

      const allResults: Excel[] = []
      const newRunFailures: DeferredFailure[] = []
      let processedRows = 0

      for (let b = 0; b < totalBatches; b++) {
        const batch = rows.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)

        for (const row of batch) {
          const result = await geocodeExcelRow(geocoder, row)
          if (result.success && result.data) {
            allResults.push(result.data)
          } else {
            newRunFailures.push(
              createDeferredFailure(
                row,
                result.failReason ?? "geocode",
                fileName || null,
              ),
            )
          }
          processedRows += 1
          setProgress({ current: processedRows, total: totalRows })
        }

        if (b < totalBatches - 1) {
          await new Promise((r) => setTimeout(r, 3000))
        }
      }

      if (allResults.length > 0) {
        const { error } = await supabase
          .from("excel")
          .upsert(allResults)
          .select()

        if (error) {
          Sentry.captureException(error)
          Sentry.captureMessage(
            "주소 데이터 업로드(excel upsert)에 실패했습니다.",
          )
          toast.error(`데이터 업로드 중 오류가 발생했습니다. ${error.message}`)
          throw error
        }

        toast.success(
          `${allResults.length}건이 좌표 변환 후 저장되었습니다. (파일 ${totalRows}행 기준)`,
        )
      } else if (totalRows > 0) {
        toast.warning(
          "이번 파일에서 저장된 행이 없습니다. 실패 보관함에서 주소를 손볼 수 있습니다.",
        )
      }

      if (newRunFailures.length > 0) {
        toast.warning(
          `주소 변환에 실패한 ${newRunFailures.length}건은 실패 보관함에 모였습니다.`,
        )
      }

      setFailData((prev) =>
        mergeDeferredLists(
          prev,
          newRunFailures,
          preserveQueueBeforeUpload ? "append" : "replace",
        ),
      )
    } catch (error) {
      Sentry.captureException(error)
      Sentry.captureMessage("(don't know why) 주소 변환에 실패했습니다.")
      toast.error("주소 변환에 실패하였습니다. 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  const handleEditFailedData = async (
    deferredId: string,
    editedData: Excel,
  ): Promise<void> => {
    setLoading(true)
    try {
      await waitForKakaoMaps()
      const geocoder = new window.kakao.maps.services.Geocoder()

      const result = await geocodeExcelRow(geocoder, editedData)

      if (result.success && result.data) {
        const { error } = await supabase
          .from("excel")
          .insert([result.data])
          .select()

        if (error) {
          Sentry.captureException(error)
          Sentry.captureMessage("실패 행 재업로드(insert)에 실패했습니다.")
          toast.error(`저장에 실패했습니다. ${error.message}`)
          setFailData((prev) =>
            prev.map((f) =>
              f.id === deferredId
                ? { ...f, excel: editedData, reason: "db" }
                : f,
            ),
          )

          return
        }

        setFailData((prev) => prev.filter((item) => item.id !== deferredId))

        toast.success("데이터가 성공적으로 변환되어 업로드되었습니다.")
      } else {
        setFailData((prev) =>
          prev.map((f) =>
            f.id === deferredId
              ? {
                  ...f,
                  excel: editedData,
                  reason: result.failReason ?? "geocode",
                }
              : f,
          ),
        )

        toast.error("주소 변환에 실패했습니다. 다른 주소로 시도해보세요.")
      }
    } catch (error) {
      Sentry.captureException(error)
      Sentry.captureMessage("카카오 주소 변환에 실패했습니다.")
      toast.error(
        "데이터 처리 중 오류가 발생했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRetryAllFailedData = async (): Promise<void> => {
    if (failData.length === 0) return

    setLoading(true)
    try {
      await waitForKakaoMaps()
      const geocoder = new window.kakao.maps.services.Geocoder()

      const snapshot = [...failData]
      const totalItems = snapshot.length
      setProgress({ current: 0, total: totalItems })

      let successCount = 0
      const stillFailed: DeferredFailure[] = []

      for (let i = 0; i < totalItems; i++) {
        const item = snapshot[i]
        setProgress({ current: i + 1, total: totalItems })

        const result = await geocodeExcelRow(geocoder, item.excel)

        if (result.success && result.data) {
          const { error } = await supabase
            .from("excel")
            .insert([result.data])
            .select()

          if (!error) {
            successCount += 1
          } else {
            Sentry.captureException(error)
            stillFailed.push({
              ...item,
              excel: result.data,
              reason: "db",
            })
          }
        } else {
          stillFailed.push({
            ...item,
            reason: result.failReason ?? "geocode",
          })
        }

        await new Promise((r) => setTimeout(r, 500))
      }

      const snapIds = new Set(snapshot.map((s) => s.id))

      setFailData((prev) => {
        const untouched = prev.filter((p) => !snapIds.has(p.id))

        return mergeDeferredLists(untouched, stillFailed, "append")
      })

      if (successCount > 0) {
        toast.success(
          `${successCount}개의 데이터가 성공적으로 변환되어 업로드되었습니다.`,
        )
      }

      if (stillFailed.length > 0) {
        toast.warning(
          `${stillFailed.length}개의 데이터는 여전히 변환 또는 저장에 실패했습니다.`,
        )
      }
    } catch (error) {
      Sentry.captureException(error)
      Sentry.captureMessage("카카오 주소 변환에 실패했습니다.")
      toast.error(
        "데이터 처리 중 오류가 발생했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDeferred = (deferredId: string) => {
    setFailData((prev) => prev.filter((f) => f.id !== deferredId))
    toast.info("보관함에서 제거했습니다.")
  }

  const handleClearDeferredQueue = () => {
    if (failData.length === 0) return
    if (
      !confirm("실패 보관함을 모두 비울까요? 이 작업은 되돌릴 수 없습니다.")
    ) {
      return
    }
    setFailData([])
    toast.info("실패 보관함을 비웠습니다.")
  }

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
      reader.onload = (ev) => setExcelFile(ev.target?.result as ArrayBuffer)
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
          preserveQueueBeforeUpload={preserveQueueBeforeUpload}
          onPreserveQueueChange={handlePreserveQueueChange}
          onClearDeferredQueue={handleClearDeferredQueue}
          onRemoveDeferred={handleRemoveDeferred}
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
