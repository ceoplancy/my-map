import styled from "@emotion/styled"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import { useCallback, useMemo } from "react"
import { format } from "date-fns"
import { toast } from "react-toastify"
import supabase from "@/lib/supabase/supabaseClient"
import { COLORS } from "@/styles/global-style"
import { getPublicSiteUrl } from "@/lib/siteUrl"
import type { Tables } from "@/types/db"

type IdPhotoRow = Tables<"shareholder_id_photo">

type Props = {
  // legacy `excel` 숫자 id — UUID 주주에는 QR 미노출
  excelId: string | number

  /** 주주 이름 (QR 안내 문구용) */
  shareholderName?: string | null
}

export function ShareholderIdCardPanel({ excelId, shareholderName }: Props) {
  const queryClient = useQueryClient()

  const uploadPageUrl = useMemo(() => {
    const base = getPublicSiteUrl().replace(/\/$/, "")

    return `${base}/id-upload/${excelId}`
  }, [excelId])

  const numericExcelId = Number(excelId)
  const legacyIdOk =
    Number.isFinite(numericExcelId) &&
    numericExcelId > 0 &&
    String(excelId) === String(numericExcelId)

  const {
    data: rows,
    error: listError,
    isLoading,
  } = useQuery({
    queryKey: ["shareholder-id-photos", excelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shareholder_id_photo")
        .select("*")
        .eq("excel_id", numericExcelId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data ?? []) as IdPhotoRow[]
    },
    enabled: legacyIdOk,
    staleTime: 15_000,
  })

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["shareholder-id-photos", excelId],
    })
  }, [queryClient, excelId])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(uploadPageUrl)
      toast.success("링크를 복사했습니다.")
    } catch {
      window.prompt("아래 링크를 복사해 주세요.", uploadPageUrl)
    }
  }

  if (!legacyIdOk) {
    return (
      <Wrap>
        <Muted>
          신분증 QR·제출 링크는 숫자 ID(레거시 명부) 주주에만 제공됩니다.
        </Muted>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <Lead>
        주주 본인이 휴대폰으로 신분증을 올릴 수 있는 링크입니다. 아래 QR을
        보여주거나 링크를 보내 주세요.
        {shareholderName ? (
          <>
            {" "}
            (<strong>{shareholderName}</strong> 행에 연결됩니다)
          </>
        ) : null}
      </Lead>

      <QrRow>
        <QrBox>
          <QRCodeSVG value={uploadPageUrl} size={168} level="M" />
        </QrBox>
        <QrActions>
          <MiniBtn type="button" onClick={() => void copyLink()}>
            링크 복사
          </MiniBtn>
          <MiniBtn type="button" variant="ghost" onClick={refresh}>
            목록 새로고침
          </MiniBtn>
        </QrActions>
      </QrRow>

      <UrlLine title={uploadPageUrl}>{uploadPageUrl}</UrlLine>

      <SubTitle>제출 이력 (최신이 위)</SubTitle>
      {listError ? (
        <Muted>
          제출 목록을 불러오지 못했습니다. 로그인 상태를 확인해 주세요.
        </Muted>
      ) : isLoading ? (
        <Muted>불러오는 중…</Muted>
      ) : !rows?.length ? (
        <Muted>아직 제출된 신분증이 없습니다.</Muted>
      ) : (
        <HistoryList>
          {rows.map((r, idx) => (
            <HistoryRow key={r.id}>
              <div>
                <Badge>{idx === 0 ? "최신" : "이전"}</Badge>
                <Meta>
                  {format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
                  {r.uploader_name ? ` · 본인: ${r.uploader_name}` : ""}
                  {r.guide_name ? ` · 안내: ${r.guide_name}` : ""}
                </Meta>
              </div>
              <DownLink
                href={r.file_url}
                target="_blank"
                rel="noopener noreferrer">
                열기 / 저장
              </DownLink>
            </HistoryRow>
          ))}
        </HistoryList>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Lead = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${COLORS.gray[700]};
  line-height: 1.5;
`

const QrRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
`

const QrBox = styled.div`
  padding: 12px;
  background: white;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 12px;
`

const QrActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MiniBtn = styled.button<{ variant?: "ghost" }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid
    ${({ variant }) =>
      variant === "ghost" ? COLORS.gray[300] : COLORS.blue[500]};
  background: ${({ variant }) =>
    variant === "ghost" ? "white" : COLORS.blue[500]};
  color: ${({ variant }) => (variant === "ghost" ? COLORS.gray[700] : "white")};

  &:hover {
    filter: brightness(0.97);
  }
`

const UrlLine = styled.div`
  font-size: 11px;
  color: ${COLORS.gray[500]};
  word-break: break-all;
  line-height: 1.4;
`

const SubTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${COLORS.gray[800]};
  margin-top: 4px;
`

const Muted = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${COLORS.gray[500]};
`

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
`

const HistoryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  background: ${COLORS.gray[50]};
  border-radius: 8px;
  font-size: 12px;
`

const Badge = styled.span`
  display: inline-block;
  margin-right: 6px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  color: ${COLORS.blue[700]};
  background: ${COLORS.blue[50]};
  border-radius: 4px;
`

const Meta = styled.div`
  display: inline;
  color: ${COLORS.gray[700]};
  line-height: 1.4;
`

const DownLink = styled.a`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${COLORS.blue[600]};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`
