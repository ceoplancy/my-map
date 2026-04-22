import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState, useEffect } from "react"
import type { Tables } from "@/types/db"
import { useUpdateShareholderList } from "@/api/workspace"
import supabase from "@/lib/supabase/supabaseClient"
import { toast } from "react-toastify"
import { reportError } from "@/lib/reportError"
import { QRCodeSVG } from "qrcode.react"
import {
  formatKoreanPhoneInput,
  normalizePhoneForDb,
} from "@/lib/formatKoreanPhone"

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`

const Modal = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 32rem;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
`

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  margin-bottom: 1.25rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`

const Label = styled.label`
  font-weight: 500;
  font-size: 0.875rem;
  color: ${COLORS.gray[700]};
`

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: ${COLORS.gray[700]};
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
`

const Button = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &.cancel {
    color: ${COLORS.gray[600]};
    background: ${COLORS.gray[100]};
    border: none;

    &:hover {
      background: ${COLORS.gray[200]};
    }
  }

  &.save {
    color: white;
    background: ${COLORS.blue[500]};
    border: none;

    &:hover {
      background: ${COLORS.blue[600]};
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

type ShareholderListRow = Tables<"shareholder_lists">

interface Props {
  list: ShareholderListRow
  onClose: () => void
}

export default function EditListModal({ list, onClose }: Props) {
  const [name, setName] = useState(list.name)
  const [activeFrom, setActiveFrom] = useState(list.active_from ?? "")
  const [activeTo, setActiveTo] = useState(list.active_to ?? "")
  const [isVisible, setIsVisible] = useState(list.is_visible)
  const [contactPhone, setContactPhone] = useState(list.contact_phone ?? "")
  const [contactNote, setContactNote] = useState(list.contact_note ?? "")
  const [qrBusy, setQrBusy] = useState(false)
  const [issuedMemberUrl, setIssuedMemberUrl] = useState<string | null>(null)
  const [issuedPublicDropUrl, setIssuedPublicDropUrl] = useState<string | null>(
    null,
  )
  const updateList = useUpdateShareholderList()

  useEffect(() => {
    setName(list.name)
    setActiveFrom(list.active_from ?? "")
    setActiveTo(list.active_to ?? "")
    setIsVisible(list.is_visible)
    setContactPhone(
      formatKoreanPhoneInput(normalizePhoneForDb(list.contact_phone) ?? ""),
    )
    setContactNote(list.contact_note ?? "")
    setIssuedMemberUrl(null)
    setIssuedPublicDropUrl(null)
  }, [list])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateList.mutate(
      {
        id: list.id,
        name: name.trim(),
        active_from: activeFrom.trim() || null,
        active_to: activeTo.trim() || null,
        is_visible: isVisible,
        contact_phone: normalizePhoneForDb(contactPhone),
        contact_note: contactNote.trim() || null,
      },
      {
        onSuccess: () => onClose(),
      },
    )
  }

  const issueMemberSessionLink = async () => {
    setQrBusy(true)
    try {
      const token = crypto.randomUUID().replace(/-/g, "")
      const expires_at = new Date(Date.now() + 7 * 86400000).toISOString()
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from("list_upload_tokens").insert({
        list_id: list.id,
        token,
        expires_at,
        created_by: auth.user?.id ?? null,
        purpose: "member_session",
      })
      if (error) throw error
      const url = `${window.location.origin}/upload-photo?t=${token}`
      setIssuedMemberUrl(url)
      await navigator.clipboard.writeText(url)
      toast.success(
        "현장요원용 링크를 클립보드에 복사했습니다. (로그인 후 사용 · 7일)",
      )
    } catch (err) {
      reportError(err, { toastMessage: "링크 발급에 실패했습니다." })
    } finally {
      setQrBusy(false)
    }
  }

  const issuePublicDropLink = async () => {
    setQrBusy(true)
    try {
      const token = crypto.randomUUID().replace(/-/g, "")
      const expires_at = new Date(Date.now() + 7 * 86400000).toISOString()
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from("list_upload_tokens").insert({
        list_id: list.id,
        token,
        expires_at,
        created_by: auth.user?.id ?? null,
        purpose: "public_drop",
      })
      if (error) throw error
      const url = `${window.location.origin}/photo-drop?t=${token}`
      setIssuedPublicDropUrl(url)
      await navigator.clipboard.writeText(url)
      toast.success(
        "누구나 접수용 링크를 클립보드에 복사했습니다. (로그인 불필요 · 7일)",
      )
    } catch (err) {
      reportError(err, { toastMessage: "공개 접수 링크 발급에 실패했습니다." })
    } finally {
      setQrBusy(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>주주명부 수정</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>명부명 (상장사명 등)</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: OO상장사"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>활성화 시작일</Label>
            <Input
              type="date"
              value={activeFrom}
              onChange={(e) => setActiveFrom(e.target.value)}
            />
          </FormGroup>
          <FormGroup>
            <Label>활성화 종료일</Label>
            <Input
              type="date"
              value={activeTo}
              onChange={(e) => setActiveTo(e.target.value)}
            />
          </FormGroup>
          <ToggleLabel>
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
            />
            지도 노출
          </ToggleLabel>
          <FormGroup>
            <Label>명부 연락처 (전화)</Label>
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={contactPhone}
              onChange={(e) =>
                setContactPhone(
                  formatKoreanPhoneInput(
                    normalizePhoneForDb(e.target.value) ?? "",
                  ),
                )
              }
              placeholder="02-0000-0000 또는 010-0000-0000"
            />
          </FormGroup>
          <FormGroup>
            <Label>연락처 메모</Label>
            <Input
              type="text"
              value={contactNote}
              onChange={(e) => setContactNote(e.target.value)}
            />
          </FormGroup>
          <p
            style={{
              fontSize: "0.8rem",
              color: COLORS.gray[600],
              margin: "0 0 0.5rem",
            }}>
            규율 버전: {list.rules_version ?? 1} (운영에서 갱신)
          </p>
          <Button
            type="button"
            style={{
              width: "100%",
              padding: "0.5rem",
              marginBottom: "0.5rem",
              borderRadius: "0.5rem",
              border: `1px solid ${COLORS.gray[200]}`,
              background: COLORS.gray[50],
              cursor: qrBusy ? "not-allowed" : "pointer",
            }}
            disabled={qrBusy}
            onClick={() => void issuePublicDropLink()}>
            누구나 사진 접수 링크 발급 (클립보드 복사 · QR)
          </Button>
          {issuedPublicDropUrl ? (
            <div
              style={{
                marginBottom: "0.75rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: `1px solid ${COLORS.purple[200]}`,
                background: COLORS.purple[50],
                textAlign: "center",
              }}>
              <div style={{ display: "inline-block", marginBottom: "0.5rem" }}>
                <QRCodeSVG value={issuedPublicDropUrl} size={192} level="M" />
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: COLORS.gray[700],
                  wordBreak: "break-all",
                  margin: 0,
                }}>
                {issuedPublicDropUrl}
              </p>
              <p
                style={{
                  fontSize: "0.7rem",
                  color: COLORS.gray[600],
                  margin: "0.35rem 0 0",
                }}>
                로그인 없이 사진만 올립니다. 현장요원은 워크스페이스의
                &quot;공개 접수함&quot;에서 내려받을 수 있습니다.
              </p>
            </div>
          ) : null}
          <Button
            type="button"
            style={{
              width: "100%",
              padding: "0.5rem",
              marginBottom: "0.75rem",
              borderRadius: "0.5rem",
              border: `1px solid ${COLORS.gray[200]}`,
              background: COLORS.gray[50],
              cursor: qrBusy ? "not-allowed" : "pointer",
            }}
            disabled={qrBusy}
            onClick={() => void issueMemberSessionLink()}>
            현장요원용 링크 발급 (로그인 · 주주 선택 후 업로드)
          </Button>
          {issuedMemberUrl ? (
            <div
              style={{
                marginBottom: "0.75rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: `1px solid ${COLORS.gray[200]}`,
                background: COLORS.gray[50],
                textAlign: "center",
              }}>
              <div style={{ display: "inline-block", marginBottom: "0.5rem" }}>
                <QRCodeSVG value={issuedMemberUrl} size={168} level="M" />
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: COLORS.gray[700],
                  wordBreak: "break-all",
                  margin: 0,
                }}>
                {issuedMemberUrl}
              </p>
              <p
                style={{
                  fontSize: "0.7rem",
                  color: COLORS.gray[500],
                  margin: "0.35rem 0 0",
                }}>
                현장요원이 로그인한 뒤 주주를 고른 뒤 신분증 사진을 올립니다.
              </p>
            </div>
          ) : null}
          <ButtonGroup style={{ marginBottom: "0.75rem" }}>
            <Button
              type="button"
              className="cancel"
              style={{ flex: 1 }}
              disabled={updateList.isPending}
              onClick={() => {
                if (
                  !confirm("명부를 완료 처리할까요? (재확인 후 아카이브 가능)")
                ) {
                  return
                }
                updateList.mutate({
                  id: list.id,
                  completed_at: new Date().toISOString(),
                })
              }}>
              완료 표시
            </Button>
            <Button
              type="button"
              className="cancel"
              style={{ flex: 1, color: COLORS.purple[800] }}
              disabled={updateList.isPending}
              onClick={() => {
                if (!confirm("명부를 아카이브하고 지도에서 숨길까요?")) {
                  return
                }
                updateList.mutate({
                  id: list.id,
                  archived_at: new Date().toISOString(),
                  is_visible: false,
                })
              }}>
              아카이브
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button type="button" className="cancel" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              className="save"
              disabled={updateList.isPending || !name.trim()}>
              저장
            </Button>
          </ButtonGroup>
        </Form>
      </Modal>
    </Overlay>
  )
}
