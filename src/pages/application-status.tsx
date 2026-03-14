import { useState } from "react"
import Head from "next/head"
import Link from "next/link"
import styled from "@emotion/styled"
import Image from "next/image"
import supabase from "@/lib/supabase/supabaseClient"
import { toast } from "react-toastify"
import DotSpinner from "@/components/ui/dot-spinner"

type StatusResult = "pending" | "approved" | "rejected" | null

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
`

const Card = styled.div`
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
`

const Logo = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
  text-align: center;
`

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  margin-bottom: 1.5rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Input = styled.input`
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  &:focus {
    border-color: #1a73e8;
    outline: none;
  }
`

const Button = styled.button`
  width: 100%;
  padding: 0.875rem;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #1557b0;
  }
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`

const ResultBox = styled.div<{ status: StatusResult }>`
  margin-top: 1.5rem;
  padding: 1.25rem;
  border-radius: 8px;
  background: ${(p) =>
    p.status === "pending"
      ? "#fef3c7"
      : p.status === "approved"
        ? "#d1fae5"
        : "#fee2e2"};
  color: ${(p) =>
    p.status === "pending"
      ? "#92400e"
      : p.status === "approved"
        ? "#065f46"
        : "#991b1b"};
  font-size: 0.9375rem;
  font-weight: 500;
  text-align: center;
`

const ResultTitle = styled.div`
  font-weight: 700;
  margin-bottom: 0.25rem;
`

const Links = styled.div`
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
`

const TextLink = styled(Link)`
  font-size: 0.9375rem;
  color: #1a73e8;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

const SpinnerWrap = styled.div`
  position: relative;
  min-height: 2rem;
`

export default function ApplicationStatusPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<StatusResult>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error("이메일과 비밀번호를 입력해 주세요.")

      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        toast.error("이메일 또는 비밀번호가 올바르지 않습니다.")
        setLoading(false)

        return
      }
      const token = data.session?.access_token
      if (!token) {
        setLoading(false)

        return
      }
      const res = await fetch("/api/me/signup-status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      await supabase.auth.signOut()
      if (!res.ok) {
        toast.error("조회에 실패했습니다.")
        setLoading(false)

        return
      }
      const json = await res.json()
      const resultStatus: StatusResult =
        json?.status === "pending"
          ? "pending"
          : json?.status === "approved"
            ? "approved"
            : json?.status === "rejected"
              ? "rejected"
              : null
      setStatus(resultStatus)
      if (!json && !resultStatus) {
        setStatus(null)
        toast.info("가입 신청 내역이 없습니다.")
      }
    } finally {
      setLoading(false)
    }
  }

  const statusLabel =
    status === "pending"
      ? "검토 중"
      : status === "approved"
        ? "승인됨"
        : status === "rejected"
          ? "반려됨"
          : null

  return (
    <>
      <Head>
        <title>가입 신청 조회 | ANT:RE</title>
      </Head>
      <Page>
        <Card>
          <Logo>
            <Image
              src="/antre-logo-full.png"
              alt="ANT:RE"
              width={0}
              height={0}
              sizes="100vw"
              style={{ width: "auto", height: "auto", maxWidth: "180px" }}
            />
          </Logo>
          <Title>가입 신청 조회</Title>
          <Subtitle>
            가입 시 사용한 이메일과 비밀번호로 본인만 조회할 수 있습니다.
            <br />
            <span style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>
              조회 후 보안을 위해 로그아웃됩니다.
            </span>
          </Subtitle>

          <Form onSubmit={handleSubmit}>
            <Input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <SpinnerWrap>{loading && <DotSpinner />}</SpinnerWrap>
            <Button type="submit" disabled={loading}>
              {loading ? "조회 중..." : "조회하기"}
            </Button>
          </Form>

          {status !== null && (
            <ResultBox status={status}>
              <ResultTitle>가입 신청 상태: {statusLabel}</ResultTitle>
              {status === "pending" &&
                "운영사 검토 후 승인되면 로그인하여 이용할 수 있습니다."}
              {status === "approved" && "로그인 후 서비스를 이용해 주세요."}
              {status === "rejected" &&
                "가입이 반려되었습니다. 문의가 필요하면 운영사에 연락해 주세요."}
            </ResultBox>
          )}

          <Links>
            <TextLink href="/sign-in">로그인 화면으로</TextLink>
            <TextLink href="/sign-up">회원가입</TextLink>
          </Links>
        </Card>
      </Page>
    </>
  )
}
