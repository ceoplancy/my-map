import React, { FormEvent, ChangeEventHandler } from "react"

import { DeferredFailure } from "@/lib/excelImportDeferred"
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
  failData: DeferredFailure[]
  loading: boolean
  progress: { current: number; total: number }
  preserveQueueBeforeUpload: boolean
  onPreserveQueueChange: (_value: boolean) => void
  onClearDeferredQueue: () => void
  onRemoveDeferred: (_deferredId: string) => void
  onFileChange: ChangeEventHandler<HTMLInputElement>
  onClearFileName: () => void
  onSubmit: (_e: FormEvent<HTMLFormElement>) => Promise<void>
  onExport: (_data: DeferredFailure[]) => void
  onDrop: (_e: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (_e: React.DragEvent<HTMLDivElement>) => void
  onDragEnter: (_e: React.DragEvent<HTMLDivElement>) => void
  onEditFailedData: (_deferredId: string, _editedData: Excel) => Promise<void>
  onRetryAllFailedData: () => Promise<void>
}
