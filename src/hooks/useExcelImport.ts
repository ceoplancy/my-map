import { Excel } from "@/types/excel"
import { useState } from "react"

export interface Progress {
  current: number
  total: number
}

export interface ExcelImportState {
  failData: Excel[]
  setFailData: React.Dispatch<React.SetStateAction<Excel[]>>
  failCount: number
  setFailCount: React.Dispatch<React.SetStateAction<number>>
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
  const [failData, setFailData] = useState<Excel[]>([])
  const [failCount, setFailCount] = useState<number>(0)
  const [excelFile, setExcelFile] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [progress, setProgress] = useState<Progress>({ current: 0, total: 0 })

  return {
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
  }
}
