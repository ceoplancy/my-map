import { ChangeEventHandler, FormEvent, useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { useRouter } from "next/router"
import supabase from "@/lib/supabase/supabaseClient"
import { toast } from "react-toastify"
import { ExcelImportView } from "@/components/excel-import/ExcelImportView"
import { useSpreadsheetImport } from "@/hooks/useSpreadsheetImport"
import { useKakaoMaps } from "@/hooks/useKakaoMaps"
import type { ImportSpreadsheetRow } from "@/types/importSpreadsheet"
import type { TablesInsert, TablesUpdate } from "@/types/db"
import { parseSpreadsheetRow } from "@/lib/spreadsheetImport"

import AdminLayout from "@/layouts/AdminLayout"
import Link from "next/link"
import styled from "@emotion/styled"
import { reportError } from "@/lib/reportError"
import { useCurrentWorkspace } from "@/store/workspaceState"
import { getWorkspaceAdminBase } from "@/lib/utils"

type ShareholderInsert = TablesInsert<"shareholders">

interface GeocodingResult {
  success: boolean
  data?: ImportSpreadsheetRow
}

function spreadsheetRowToShareholderInsert(
  row: ImportSpreadsheetRow,
  listId: string,
): ShareholderInsert {
  return {
    list_id: listId,
    name: row.name ?? null,
    address: row.address ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    latlngaddress: row.latlngaddress ?? null,
    company: row.company ?? null,
    status: row.status ?? null,
    stocks: row.stocks ?? 0,
    memo: row.memo ?? null,
    maker: row.maker ?? null,
    image: row.image ?? null,
    history: row.history ?? null,
  }
}

/** 스프레드시트 덮어쓰기용 — shareholder_change_history 는 건드리지 않음 */
function patchFromImportRow(
  row: ImportSpreadsheetRow,
): TablesUpdate<"shareholders"> {
  return {
    name: row.name ?? null,
    address: row.address ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    latlngaddress: row.latlngaddress ?? null,
    company: row.company ?? null,
    status: row.status ?? null,
    stocks: row.stocks ?? 0,
    memo: row.memo ?? null,
    maker: row.maker ?? null,
    image: row.image ?? null,
    history: row.history ?? null,
  }
}

async function fetchShareholderIdsForList(
  listId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("shareholders")
    .select("id")
    .eq("list_id", listId)
  if (error) throw error

  return new Set((data ?? []).map((r) => r.id))
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))

  return out
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

const EmptyMessage = styled.div`
  padding: 3rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 1rem;
  color: #64748b;

  a {
    color: #2563eb;
    font-weight: 600;
  }
`

export const BATCH_SIZE = 50

/** 워크스페이스 스프레드시트 가져오기 본문 (workspace 설정된 상태에서 사용) */
export function ExcelImportPageContent() {
  const router = useRouter()
  const [currentWorkspace] = useCurrentWorkspace()
  const listId =
    typeof router.query.listId === "string" ? router.query.listId : null
  const base = currentWorkspace
    ? getWorkspaceAdminBase(currentWorkspace.id)
    : "/admin"

  const {
    failData,
    setFailData,
    failCount,
    setFailCount,
    spreadsheetFile,
    setSpreadsheetFile,
    fileName,
    setFileName,
    loading,
    setLoading,
    progress,
    setProgress,
  } = useSpreadsheetImport()

  const { waitForKakaoMaps } = useKakaoMaps()

  const [_processingItem, setProcessingItem] = useState<number | null>(null)

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
      toast.error(
        "지원하는 스프레드시트 형식(.xlsx, .xls, .csv)만 업로드할 수 있습니다.",
      )
      clearFileName()

      return
    }

    setFileName(selectedFile.name)
    const reader = new FileReader()
    reader.readAsArrayBuffer(selectedFile)
    reader.onload = (e) => setSpreadsheetFile(e.target?.result as ArrayBuffer)
  }

  const clearFileName = (): void => {
    setFileName("")
    setSpreadsheetFile(null)
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
    geocoder: InstanceType<typeof window.kakao.maps.services.Geocoder>,
    row: ImportSpreadsheetRow,
  ): Promise<GeocodingResult> => {
    return new Promise((resolve) => {
      geocoder.addressSearch(
        row.address ?? "",
        (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK) {
            resolve({
              success: true,
              data: {
                ...row,
                lat: result[0].y.toString(),
                lng: result[0].x.toString(),
                stocks: row.stocks || 0,
              },
            })
          } else {
            setFailData((prev) => [...prev, row])
            setFailCount((prev) => prev + 1)
            resolve({ success: false })
          }
        },
      )
    })
  }

  const processBatch = async (
    rows: ImportSpreadsheetRow[],
    geocoder: InstanceType<typeof window.kakao.maps.services.Geocoder>,
  ): Promise<ImportSpreadsheetRow[]> => {
    const results = await Promise.all(
      rows.map(async (row) => {
        const result = await handleGeocoding(geocoder, row)

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
    if (!spreadsheetFile) return
    if (!listId) {
      toast.error(
        "주주명부를 선택한 뒤 업로드해 주세요. 주주명부 목록에서 파일 가져오기를 실행하세요.",
      )

      return
    }

    setLoading(true)
    setFailData([])
    setFailCount(0)

    try {
      await waitForKakaoMaps()

      const workbook = XLSX.read(spreadsheetFile, { type: "buffer" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet)
      const parsedRows = data.map((raw, i) =>
        parseSpreadsheetRow(raw as Record<string, unknown>, i),
      )

      const totalRows = parsedRows.length

      setProgress({ current: 0, total: totalRows })

      const geocoder = new window.kakao.maps.services.Geocoder()
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE)

      let allResults: ImportSpreadsheetRow[] = []
      let processedRows = 0

      for (let i = 0; i < totalBatches; i++) {
        const batch = parsedRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
        const batchResults = await processBatch(batch, geocoder)
        allResults = [...allResults, ...batchResults]

        processedRows += batch.length
        setProgress((prev) => ({ ...prev, current: processedRows }))

        if (i < totalBatches - 1) {
          await new Promise((r) => setTimeout(r, 3000))
        }
      }

      if (allResults.length > 0) {
        const existingIds = await fetchShareholderIdsForList(listId)
        const toInsert: ShareholderInsert[] = []
        const toUpdate: { id: string; patch: TablesUpdate<"shareholders"> }[] =
          []

        for (const row of allResults) {
          const sid = row.shareholderId?.trim()
          if (sid && existingIds.has(sid)) {
            toUpdate.push({ id: sid, patch: patchFromImportRow(row) })
          } else {
            toInsert.push(spreadsheetRowToShareholderInsert(row, listId))
          }
        }

        if (toInsert.length > 0) {
          const { error } = await supabase
            .from("shareholders")
            .insert(toInsert)
            .select()

          if (error) {
            reportError(error, {
              toastMessage: `데이터 업로드 중 오류가 발생했습니다. ${error.message}`,
            })
            throw error
          }
        }

        for (const group of chunkArray(toUpdate, 50)) {
          await Promise.all(
            group.map(async ({ id, patch }) => {
              const { error } = await supabase
                .from("shareholders")
                .update(patch)
                .eq("id", id)
                .eq("list_id", listId)

              if (error) throw error
            }),
          )
        }

        toast.success(
          `신규 ${toInsert.length}건, 갱신 ${toUpdate.length}건을 반영했습니다. (파일 가져오기는 변경 이력에 기록되지 않습니다)`,
        )
      }

      if (allResults.length !== totalRows) {
        toast.warning(
          "일부 주소 변환에 실패했습니다. 실패한 주소는 아래 목록에서 확인할 수 있습니다.",
        )
      }
    } catch (error) {
      reportError(error, {
        toastMessage: "주소 변환에 실패하였습니다. 다시 시도해주세요.",
      })
    } finally {
      setLoading(false)
    }
  }

  // 실패 데이터 수정 및 재변환 함수
  const handleEditFailedData = async (
    editedData: ImportSpreadsheetRow,
  ): Promise<void> => {
    if (!listId) {
      toast.error("주주명부가 선택되지 않았습니다.")

      return
    }
    setLoading(true)
    try {
      await waitForKakaoMaps()
      const geocoder = new window.kakao.maps.services.Geocoder()

      const result = await handleGeocoding(geocoder, editedData)

      if (result.success && result.data) {
        const row = result.data
        const existingIds = await fetchShareholderIdsForList(listId)
        const sid = row.shareholderId?.trim()

        if (sid && existingIds.has(sid)) {
          const { error } = await supabase
            .from("shareholders")
            .update(patchFromImportRow(row))
            .eq("id", sid)
            .eq("list_id", listId)
            .select()
          if (error) throw error
        } else {
          const insertRow = spreadsheetRowToShareholderInsert(row, listId)
          const { error } = await supabase
            .from("shareholders")
            .insert([insertRow])
            .select()
          if (error) throw error
        }

        setFailData(
          failData.filter(
            (item) => item.latlngaddress !== editedData.latlngaddress,
          ),
        )
        setFailCount((prev) => prev - 1)

        toast.success("데이터가 성공적으로 변환되어 업로드되었습니다.")
      } else {
        setFailData(
          failData.map((item) =>
            item.latlngaddress === editedData.latlngaddress ? editedData : item,
          ),
        )

        toast.error("주소 변환에 실패했습니다. 다른 주소로 시도해보세요.")
      }
    } catch (error) {
      reportError(error, {
        toastMessage:
          "데이터 처리 중 오류가 발생했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
      })
    } finally {
      setLoading(false)
    }
  }

  // 모든 실패 데이터 재시도 함수
  const handleRetryAllFailedData = async (): Promise<void> => {
    if (failData.length === 0) return
    if (!listId) {
      toast.error("주주명부가 선택되지 않았습니다.")

      return
    }

    setLoading(true)
    try {
      await waitForKakaoMaps()
      const geocoder = new window.kakao.maps.services.Geocoder()

      const totalItems = failData.length
      setProgress({ current: 0, total: totalItems })

      const successIndices = new Set<number>()
      const existingIds = await fetchShareholderIdsForList(listId)

      for (let i = 0; i < totalItems; i++) {
        setProgress({ current: i + 1, total: totalItems })
        setProcessingItem(i)

        const result = await handleGeocoding(geocoder, failData[i])

        if (result.success && result.data) {
          const row = result.data
          const sid = row.shareholderId?.trim()

          let res
          if (sid && existingIds.has(sid)) {
            res = await supabase
              .from("shareholders")
              .update(patchFromImportRow(row))
              .eq("id", sid)
              .eq("list_id", listId)
              .select()
          } else {
            const insertRow = spreadsheetRowToShareholderInsert(row, listId)
            res = await supabase
              .from("shareholders")
              .insert([insertRow])
              .select()
          }
          if (!res.error) successIndices.add(i)

          await new Promise((r) => setTimeout(r, 1000))
        }
      }

      const newFailData = failData.filter((_, idx) => !successIndices.has(idx))
      setFailData(newFailData)
      setFailCount(newFailData.length)

      if (successIndices.size > 0) {
        toast.success(
          `${successIndices.size}개의 데이터가 성공적으로 변환되어 업로드되었습니다.`,
        )
      }

      if (newFailData.length > 0) {
        toast.warning(
          `${newFailData.length}개의 데이터는 여전히 변환에 실패했습니다.`,
        )
      }
    } catch (error) {
      reportError(error, {
        toastMessage:
          "데이터 처리 중 오류가 발생했습니다. 새로고침 혹은 로그아웃 후 다시 시도하세요.",
      })
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
        toast.error("지원하는 스프레드시트 형식만 업로드할 수 있습니다.")
        clearFileName()

        return
      }

      setFileName(file.name)
      const reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = (e) => setSpreadsheetFile(e.target?.result as ArrayBuffer)
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

  if (!listId) {
    return (
      <Container>
        <Header>
          <Title>파일 가져오기</Title>
        </Header>
        <EmptyMessage>
          주주명부를 선택한 뒤 파일 가져오기를 진행해 주세요.{" "}
          <Link href={`${base}/lists`}>주주명부 목록</Link>에서 해당 명부의
          &quot;파일 가져오기&quot;를 눌러 주세요.
        </EmptyMessage>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>파일 가져오기</Title>
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
  )
}

function ExcelImport() {
  const router = useRouter()
  const [currentWorkspace] = useCurrentWorkspace()

  useEffect(() => {
    if (currentWorkspace && typeof window !== "undefined")
      router.replace({
        pathname: `/workspaces/${currentWorkspace.id}/admin/excel-import`,
        query: router.query.listId ? { listId: router.query.listId } : {},
      })
  }, [currentWorkspace, router])

  if (currentWorkspace) return null

  return (
    <AdminLayout>
      <Container>
        <Header>
          <Title>파일 가져오기</Title>
        </Header>
        <EmptyMessage>워크스페이스를 선택해 주세요.</EmptyMessage>
      </Container>
    </AdminLayout>
  )
}

export default ExcelImport
