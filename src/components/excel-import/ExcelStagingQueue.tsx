import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import { PlayArrow, Delete as DeleteIcon } from "@mui/icons-material"

import supabase from "@/lib/supabase/supabaseClient"
import type { Tables } from "@/types/db"
import GlobalSpinner from "@/components/ui/global-spinner"

type StagingRow = Tables<"excel_import_staging">

type Props = {
  listId: string
  onRetry: (_row: StagingRow) => Promise<void>
  onDelete: (_id: string) => Promise<void>
  busyId: string | null
}

export default function ExcelStagingQueue({
  listId,
  onRetry,
  onDelete,
  busyId,
}: Props) {
  const queryClient = useQueryClient()
  const { data: rows = [], isPending } = useQuery({
    queryKey: ["excelImportStaging", listId],
    enabled: !!listId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excel_import_staging")
        .select("*")
        .eq("list_id", listId)
        .order("created_at", { ascending: false })
      if (error) throw error

      return (data ?? []) as StagingRow[]
    },
  })

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ["excelImportStaging", listId],
    })
  }

  const pending = rows.filter((r) => r.status !== "imported")

  if (isPending) {
    return (
      <Box sx={{ py: 2 }}>
        <GlobalSpinner width={22} height={22} dotColor="#8536FF" />
      </Box>
    )
  }

  if (pending.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          background: "#f8fafc",
        }}>
        <Typography variant="body2" color="text.secondary">
          DB에 저장된 보류 행이 없습니다. 주소 변환에 실패한 행은 자동으로
          보류함에 쌓이며, 여기서 나중에 재시도할 수 있습니다.
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        mb: 3,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        보류함 (DB) · {pending.length}건
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        새로고침 후에도 이 목록은 유지됩니다. 주소를 고친 뒤 재시도하거나
        불필요한 행을 삭제하세요.
      </Typography>
      <TableContainer
        sx={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          maxWidth: "100%",
        }}>
        <Table size="small" sx={{ minWidth: 380 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "action.hover" }}>
              <TableCell>원본 주소</TableCell>
              <TableCell>주식수</TableCell>
              <TableCell>상태</TableCell>
              <TableCell align="right">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pending.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.original_address ?? "—"}</TableCell>
                <TableCell>{r.stocks}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell align="right">
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "flex-end" }}
                    justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayArrow />}
                      disabled={busyId === r.id}
                      onClick={async () => {
                        await onRetry(r)
                        refresh()
                      }}>
                      재시도
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      disabled={busyId === r.id}
                      onClick={async () => {
                        await onDelete(r.id)
                        refresh()
                      }}>
                      삭제
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
