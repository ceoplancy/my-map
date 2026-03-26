import type { ImportSpreadsheetRow } from "@/types/importSpreadsheet"
import { useState } from "react"

export interface Progress {
  current: number
  total: number
}

export interface SpreadsheetImportState {
  failData: ImportSpreadsheetRow[]
  setFailData: React.Dispatch<React.SetStateAction<ImportSpreadsheetRow[]>>
  failCount: number
  setFailCount: React.Dispatch<React.SetStateAction<number>>
  spreadsheetFile: ArrayBuffer | null
  setSpreadsheetFile: React.Dispatch<React.SetStateAction<ArrayBuffer | null>>
  fileName: string
  setFileName: React.Dispatch<React.SetStateAction<string>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  progress: Progress
  setProgress: React.Dispatch<React.SetStateAction<Progress>>
}

export const useSpreadsheetImport = (): SpreadsheetImportState => {
  const [failData, setFailData] = useState<ImportSpreadsheetRow[]>([])
  const [failCount, setFailCount] = useState<number>(0)
  const [spreadsheetFile, setSpreadsheetFile] = useState<ArrayBuffer | null>(
    null,
  )
  const [fileName, setFileName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [progress, setProgress] = useState<Progress>({ current: 0, total: 0 })

  return {
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
  }
}
