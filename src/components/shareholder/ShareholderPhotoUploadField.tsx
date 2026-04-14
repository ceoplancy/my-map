import styled from "@emotion/styled"
import { useRef, useState } from "react"
import { toast } from "react-toastify"
import { COLORS } from "@/styles/global-style"
import { uploadShareholderImageFile } from "@/lib/uploadShareholderImage"

type Props = {
  shareholderId: string | number
  imageUrl: string | null | undefined
  onChangeUrl: (_url: string) => void
  disabled?: boolean
}

export function ShareholderPhotoUploadField({
  shareholderId,
  imageUrl,
  onChangeUrl,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setBusy(true)
    try {
      const url = await uploadShareholderImageFile(shareholderId, file)
      onChangeUrl(url)
      toast.success("사진을 올렸습니다. 저장 시 반영됩니다.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드에 실패했습니다.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Wrap>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        disabled={disabled || busy}
        onChange={onPick}
      />
      {imageUrl ? (
        <PreviewBox>
          <PreviewImg src={imageUrl} alt="첨부 사진" />
        </PreviewBox>
      ) : null}
      <BtnRow>
        <MiniButton
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}>
          {busy ? "업로드 중…" : "사진 올리기"}
        </MiniButton>
        {imageUrl ? (
          <MiniButton
            type="button"
            variant="ghost"
            disabled={disabled || busy}
            onClick={() => onChangeUrl("")}>
            사진 지우기
          </MiniButton>
        ) : null}
      </BtnRow>
      <Hint>
        JPG·PNG·WebP·GIF, 최대 5MB. Supabase Storage 버킷 설정이 필요합니다.
      </Hint>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const PreviewBox = styled.div`
  max-width: 280px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${COLORS.gray[200]};
`

const PreviewImg = styled.img`
  display: block;
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: contain;
  background: ${COLORS.gray[50]};
`

const BtnRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const MiniButton = styled.button<{ variant?: "ghost" }>`
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    filter: brightness(0.97);
  }
`

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${COLORS.gray[500]};
  line-height: 1.4;
`
