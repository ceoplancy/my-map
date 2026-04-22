import * as React from "react"

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material"

import {
  DEFAULT_SHAREHOLDER_REGISTRY_EXPORT_OPTIONS,
  type ShareholderRegistryExportOptions,
} from "@/lib/shareholderRegistryExportWorkbook"
import { COLORS } from "@/styles/global-style"

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (_opts: ShareholderRegistryExportOptions) => void

  /** 요약 시트 상단에 표시할 조건 설명 */
  filterDescriptionPreview: string
  rowCount: number

  /**
   * 보내기 대상 설명 아래 괄호 문구.
   * 기본: 명부 목록(필터·정렬). 대시보드 등에서 다른 문구로 바꿀 수 있음.
   */
  scopeFootnote?: string
}

export default function ShareholderExportDialog({
  open,
  onClose,
  onConfirm,
  filterDescriptionPreview,
  rowCount,
  scopeFootnote = "(현재 목록 필터·정렬 적용 결과)",
}: Props) {
  const [opts, setOpts] = React.useState<ShareholderRegistryExportOptions>({
    ...DEFAULT_SHAREHOLDER_REGISTRY_EXPORT_OPTIONS,
  })

  React.useEffect(() => {
    if (open) {
      setOpts({ ...DEFAULT_SHAREHOLDER_REGISTRY_EXPORT_OPTIONS })
    }
  }, [open])

  const handleChangeHistoryMode = (
    _: React.SyntheticEvent,
    v: string,
  ): void => {
    setOpts((prev) => ({
      ...prev,
      changeHistoryMode:
        v as ShareholderRegistryExportOptions["changeHistoryMode"],
    }))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>엑셀 내보내기 옵션</DialogTitle>
      <DialogContent
        dividers
        sx={{
          maxHeight: { xs: "min(85vh, 720px)", sm: "70vh" },
          overflowY: "auto",
        }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          보내기 대상: <strong>{rowCount.toLocaleString("ko-KR")}명</strong>{" "}
          {scopeFootnote}
        </Typography>
        <Typography
          variant="caption"
          display="block"
          sx={{ mb: 2, color: COLORS.gray[600], lineHeight: 1.5 }}>
          조건 요약(요약 시트에 포함): {filterDescriptionPreview}
        </Typography>

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            요약 시트
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={opts.includeSummarySheet}
                onChange={(e) =>
                  setOpts((p) => ({
                    ...p,
                    includeSummarySheet: e.target.checked,
                  }))
                }
              />
            }
            label="1번째 시트에 건수·1차 상태·주소 변환 집계·위 옵션 요약 포함"
          />
        </FormControl>

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            변경이력
          </Typography>
          <RadioGroup
            value={opts.changeHistoryMode}
            onChange={handleChangeHistoryMode}>
            <FormControlLabel
              value="none"
              control={<Radio size="small" />}
              label="포함하지 않음"
            />
            <FormControlLabel
              value="inline"
              control={<Radio size="small" />}
              label='상세 시트에 "변경이력" 열로 포함 (한 셀에 요약)'
            />
            <FormControlLabel
              value="separate_sheet"
              control={<Radio size="small" />}
              label="별도 시트「변경이력상세」(건·건 이전·이후·작업자)"
            />
          </RadioGroup>
        </FormControl>

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            상세 시트 구성
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={opts.splitSheetsByPrimaryStatus}
                onChange={(e) =>
                  setOpts((p) => ({
                    ...p,
                    splitSheetsByPrimaryStatus: e.target.checked,
                  }))
                }
              />
            }
            label="1차 상태(미방문·완료 등)별로 시트 분리 (끄면 한 장의「상세」)"
          />
        </FormControl>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          상세 시트 열 (항목)
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={opts.includeMaker}
                onChange={(e) =>
                  setOpts((p) => ({ ...p, includeMaker: e.target.checked }))
                }
              />
            }
            label="담당(마커)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={opts.includeCoordinates}
                onChange={(e) =>
                  setOpts((p) => ({
                    ...p,
                    includeCoordinates: e.target.checked,
                  }))
                }
              />
            }
            label="위도·경도"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={opts.includeGeocodeStatus}
                onChange={(e) =>
                  setOpts((p) => ({
                    ...p,
                    includeGeocodeStatus: e.target.checked,
                  }))
                }
              />
            }
            label="주소 변환 상태(성공·대기·실패)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={opts.includeResolvedAddress}
                onChange={(e) =>
                  setOpts((p) => ({
                    ...p,
                    includeResolvedAddress: e.target.checked,
                  }))
                }
              />
            }
            label="주소 변환 기준 주소"
          />
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          취소
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            onConfirm(opts)
            onClose()
          }}>
          다운로드
        </Button>
      </DialogActions>
    </Dialog>
  )
}
