import { useRouter } from "next/router"
import { useEffect, useMemo, useState } from "react"
import styled from "@emotion/styled"
import { toast } from "react-toastify"

import { useSession } from "@/api/auth"
import { useShareholders } from "@/api/workspace"
import GlobalSpinner from "@/components/ui/global-spinner"
import { COLORS } from "@/styles/global-style"
import { reportError } from "@/lib/reportError"
import supabase from "@/lib/supabase/supabaseClient"
import { uploadShareholderPhotoAndGetPublicUrl } from "@/lib/shareholderPhotoStorage"
import type { Tables } from "@/types/db"
import {
  composeShareholderStatus,
  completionDetailFromPhotos,
  getPrimaryStatusCategory,
} from "@/lib/shareholderStatus"

const Page = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  box-sizing: border-box;
  padding: max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right))
    max(1.25rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  max-width: 32rem;
  margin: 0 auto;
  background: ${COLORS.background.light};
`

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  margin-bottom: 1rem;
`

const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
`

const Pick = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.65rem 0.75rem;
  min-height: 2.75rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  background: white;
  margin-bottom: 0.35rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

type TokenRow = Tables<"list_upload_tokens">

export default function UploadPhotoPage() {
  const router = useRouter()
  const t = router.query.t
  const tokenStr = typeof t === "string" ? t : ""
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [tokenRow, setTokenRow] = useState<TokenRow | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Tables<"shareholders"> | null>(null)
  const [busy, setBusy] = useState(false)

  const listId = tokenRow?.list_id ?? null

  const { data: shareholders = [], isPending } = useShareholders({
    listId,
  })

  useEffect(() => {
    if (!router.isReady || !tokenStr) {
      return
    }
    void (async () => {
      const { data, error } = await supabase
        .from("list_upload_tokens")
        .select("*")
        .eq("token", tokenStr)
        .maybeSingle()
      if (error) {
        setTokenError(error.message)

        return
      }
      if (!data) {
        setTokenError("유효하지 않은 링크입니다.")

        return
      }
      if (new Date(data.expires_at) < new Date()) {
        setTokenError("만료된 링크입니다.")

        return
      }
      setTokenRow(data)
    })()
  }, [router.isReady, tokenStr])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      return shareholders.slice(0, 25)
    }

    return shareholders
      .filter(
        (s) =>
          (s.name ?? "").toLowerCase().includes(q) ||
          (s.company ?? "").toLowerCase().includes(q) ||
          (s.address ?? "").toLowerCase().includes(q) ||
          (s.address_original ?? "").toLowerCase().includes(q) ||
          (s.latlngaddress ?? "").toLowerCase().includes(q),
      )
      .slice(0, 40)
  }, [shareholders, search])

  const onUpload = async (file: File) => {
    if (!userId || !selected || !listId) {
      toast.error("로그인·주주 선택을 확인해 주세요.")

      return
    }
    setBusy(true)
    try {
      const url = await uploadShareholderPhotoAndGetPublicUrl(
        file,
        listId,
        selected.id,
      )
      const completionPatch =
        getPrimaryStatusCategory(selected.status) === "완료"
          ? {
              status: composeShareholderStatus(
                "완료",
                completionDetailFromPhotos(selected.proxy_document_image, url),
              ),
            }
          : {}

      const { error } = await supabase
        .from("shareholders")
        .update({ image: url, ...completionPatch })
        .eq("id", selected.id)
        .eq("list_id", listId)
      if (error) throw error
      toast.success("사진이 등록되었습니다.")
      setSelected(null)
    } catch (e) {
      reportError(e, { toastMessage: "업로드에 실패했습니다." })
    } finally {
      setBusy(false)
    }
  }

  if (!router.isReady) {
    return (
      <Page>
        <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
      </Page>
    )
  }

  if (!userId) {
    return (
      <Page>
        <Title>로그인 필요</Title>
        <p style={{ color: COLORS.gray[600] }}>
          사진 등록을 위해 로그인해 주세요.
        </p>
      </Page>
    )
  }

  if (tokenError) {
    return (
      <Page>
        <Title>링크 오류</Title>
        <p style={{ color: COLORS.red[600] }}>{tokenError}</p>
      </Page>
    )
  }

  if (!tokenRow) {
    return (
      <Page>
        <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
      </Page>
    )
  }

  return (
    <Page>
      <Title>주주 사진 등록</Title>
      <p style={{ color: COLORS.gray[600], fontSize: "0.875rem" }}>
        주주를 선택한 뒤 사진을 촬영하거나 파일을 선택하세요.
      </p>
      <Input
        placeholder="이름·회사·주소로 검색…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isPending ? (
        <GlobalSpinner width={22} height={22} dotColor="#8536FF" />
      ) : (
        filtered.map((s) => (
          <Pick
            key={s.id}
            type="button"
            disabled={busy}
            onClick={() => setSelected(s)}>
            {[s.company, s.name].filter(Boolean).join(" · ") || s.id}{" "}
            <small style={{ color: COLORS.gray[500] }}>{s.address}</small>
          </Pick>
        ))
      )}
      {selected ? (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            선택:{" "}
            {[selected.company, selected.name].filter(Boolean).join(" · ")}
          </p>
          <Input
            disabled={busy}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ""
              if (f) void onUpload(f)
            }}
          />
        </div>
      ) : null}
    </Page>
  )
}
