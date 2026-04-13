import {
  DeferredFailure,
  loadDeferredFailures,
  saveDeferredFailures,
} from "@/lib/excelImportDeferred"
import { useEffect, useState } from "react"

export interface Progress {
  current: number
  total: number
}

export interface ExcelImportState {
  failData: DeferredFailure[]
  setFailData: React.Dispatch<React.SetStateAction<DeferredFailure[]>>
  failCount: number
  excelFile: ArrayBuffer | null
  setExcelFile: React.Dispatch<React.SetStateAction<ArrayBuffer | null>>
  fileName: string
  setFileName: React.Dispatch<React.SetStateAction<string>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  progress: Progress
  setProgress: React.Dispatch<React.SetStateAction<Progress>>
}

export const useExcelImport = (): ExcelImportState => {
  const [failData, setFailData] = useState<DeferredFailure[]>(() =>
    loadDeferredFailures(),
  )
  const [excelFile, setExcelFile] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [progress, setProgress] = useState<Progress>({ current: 0, total: 0 })

  useEffect(() => {
    saveDeferredFailures(failData)
  }, [failData])

  return {
    failData,
    setFailData,
    failCount: failData.length,
    excelFile,
    setExcelFile,
    fileName,
    setFileName,
    loading,
    setLoading,
    progress,
    setProgress,
  }
}
