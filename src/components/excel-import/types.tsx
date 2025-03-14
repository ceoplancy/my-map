import React, { FormEvent, ChangeEventHandler } from "react"

import { Excel } from "@/types/excel"

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
