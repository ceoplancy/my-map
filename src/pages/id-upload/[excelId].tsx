import Head from "next/head"
import { useRouter } from "next/router"
import styled from "@emotion/styled"
import { FormEvent, useMemo, useState } from "react"
import { toast } from "react-toastify"
import { COLORS } from "@/styles/global-style"

export default function IdUploadPublicPage() {
  const router = useRouter()
  const raw = router.query.excelId
  const excelId = useMemo(() => {
    const s = Array.isArray(raw) ? raw[0] : raw
    const n = Number.parseInt(String(s ?? ""), 10)

    return Number.isFinite(n) && n > 0 ? n : null
  }, [raw])

  const [uploaderName, setUploaderName] = useState("")
  const [guideName, setGuideName] = useState("")
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const input = (e.target as HTMLFormElement).elements.namedItem(
      "file",
    ) as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!excelId) {
      toast.error("잘못된 주소입니다.")

      return
    }
    if (!file) {
      toast.error("신분증 사진을 선택해 주세요.")

      return
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("excelId", String(excelId))
      fd.append("uploaderName", uploaderName.trim())
      fd.append("guideName", guideName.trim())
      fd.append("file", file)

      const res = await fetch("/api/shareholder/upload-id-photo", {
        method: "POST",
        body: fd,
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "업로드에 실패했습니다.")
      }

      toast.success("제출되었습니다. 창을 닫아도 됩니다.")
      setUploaderName("")
      setGuideName("")
      if (input) input.value = ""
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드에 실패했습니다.")
    } finally {
      setBusy(false)
    }
  }

  if (router.isReady && excelId == null) {
    return (
      <Page>
        <Head>
          <title>신분증 제출</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <Card>
          <Title>링크가 올바르지 않습니다</Title>
        </Card>
      </Page>
    )
  }

  if (!router.isReady || excelId == null) {
    return (
      <Page>
        <Head>
          <title>신분증 제출</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
      </Page>
    )
  }

  return (
    <Page>
      <Head>
        <title>신분증 제출</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Card>
        <Title>신분증 제출</Title>
        <Desc>
          아래에서 사진을 선택하거나 촬영해 주세요. 제출 내용은 해당 주주 방문
          기록에만 연결됩니다.
        </Desc>
        <Form onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="uploaderName">본인 성함 (선택)</Label>
            <Input
              id="uploaderName"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              placeholder="홍길동"
              autoComplete="name"
            />
          </Field>
          <Field>
            <Label htmlFor="guideName">안내 요원 / 현장 표기 (선택)</Label>
            <Input
              id="guideName"
              value={guideName}
              onChange={(e) => setGuideName(e.target.value)}
              placeholder="예: 김현장"
            />
          </Field>
          <Field>
            <Label htmlFor="file">신분증 사진</Label>
            <FileInput
              id="file"
              name="file"
              type="file"
              accept="image/*"
              capture="environment"
              required
            />
          </Field>
          <Submit type="submit" disabled={busy}>
            {busy ? "올리는 중…" : "제출하기"}
          </Submit>
        </Form>
      </Card>
    </Page>
  )
}

const Page = styled.div`
  min-height: 100vh;
  padding: 24px 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  box-sizing: border-box;
`

const Card = styled.div`
  max-width: 420px;
  margin: 0 auto;
  padding: 24px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
`

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 1.35rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
`

const Desc = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  color: ${COLORS.gray[600]};
  line-height: 1.5;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${COLORS.gray[700]};
`

const Input = styled.input`
  padding: 12px 14px;
  font-size: 16px;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 10px;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[400]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
`

const FileInput = styled.input`
  font-size: 14px;
`

const Submit = styled.button`
  margin-top: 8px;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: ${COLORS.blue[500]};
  border: none;
  border-radius: 12px;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`
