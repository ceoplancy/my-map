import React, { FormEvent, ChangeEventHandler } from "react"

import type { ImportSpreadsheetRow } from "@/types/importSpreadsheet"

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

export interface ExcelImportViewProps {
  fileName: string
  failCount: number
  failData: ImportSpreadsheetRow[]
  loading: boolean
  progress: { current: number; total: number }
  onFileChange: ChangeEventHandler<HTMLInputElement>
  onClearFileName: () => void
  onSubmit: (_e: FormEvent<HTMLFormElement>) => Promise<void>
  onExport: (_data: ImportSpreadsheetRow[]) => void
  onDrop: (_e: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (_e: React.DragEvent<HTMLDivElement>) => void
  onDragEnter: (_e: React.DragEvent<HTMLDivElement>) => void
  onEditFailedData: (_editedData: ImportSpreadsheetRow) => Promise<void>
  onRetryAllFailedData: () => Promise<void>
}
