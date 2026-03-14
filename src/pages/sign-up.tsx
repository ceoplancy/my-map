import { useState } from "react"
import dynamic from "next/dynamic"
import styled from "@emotion/styled"
import DotSpinner from "@/component/dot-spinner"
import Font from "@/component/font"
import Image from "next/image"
import Link from "next/link"
import { toast } from "react-toastify"

const SignInAnimation = dynamic(
  () =>
    import("@/components/animations/SignInAnimation").then(
      (m) => m.SignInAnimation,
    ),
  { ssr: false },
)

const ACCOUNT_TYPES = [
  { value: "listed_company", label: "상장사" },
  { value: "proxy_company", label: "의결권 대행사" },
] as const

const SignUp = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accountType, setAccountType] = useState<
    "listed_company" | "proxy_company"
  >("listed_company")
  const [userName, setUserName] = useState("")
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !userName) {
      toast.error("이메일, 비밀번호, 사용자명을 입력해 주세요.")

      return
    }
    if (!agreePrivacy || !agreeTerms) {
      toast.error("개인정보처리방침과 서비스이용약관에 동의해 주세요.")

      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          account_type: accountType,
          user_name: userName,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "회원가입에 실패했습니다.")

        return
      }
      setDone(true)
      toast.success("가입 신청이 완료되었습니다. 승인 후 이용 가능합니다.")
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <Container>
        <RightSection>
          <LoginContainer>
            <LogoWrapper>
              <Image
                src="/antre-logo-full.png"
                alt="logo"
                width={0}
                height={0}
                sizes="100vw"
                style={{
                  width: "auto",
                  height: "auto",
                  maxWidth: "200px",
                }}
              />
            </LogoWrapper>
            <DoneMessage>
              가입 신청이 접수되었습니다.
              <br />
              운영사 승인 후 로그인하여 이용해 주세요.
              <br />
              <small style={{ color: "#6b7280", marginTop: "0.5rem" }}>
                신청 상태는 로그인 화면의 「신청 조회」에서 확인할 수 있습니다.
              </small>
            </DoneMessage>
            <SignUpLink href="/sign-in">로그인 화면으로</SignUpLink>
          </LoginContainer>
        </RightSection>
      </Container>
    )
  }

  return (
    <Container>
      <LeftSection>
        <AnimationWrapper>
          <SignInAnimation />
        </AnimationWrapper>
        <ContentWrapper>
          <h1>앤트리맵에 가입하기</h1>
          <p>
            상장사 또는 의결권 대행사로 가입한 후
            <br />
            승인을 받으면 서비스를 이용할 수 있습니다.
          </p>
        </ContentWrapper>
      </LeftSection>

      <RightSection>
        <LoginContainer>
          <LogoWrapper>
            <Image
              src="/antre-logo-full.png"
              alt="logo"
              width={0}
              height={0}
              sizes="100vw"
              style={{
                width: "auto",
                height: "auto",
                maxWidth: "200px",
              }}
            />
          </LogoWrapper>

          <LoginForm onSubmit={handleSubmit}>
            {isLoading && <StyledDotSpinner />}

            <InputGroup>
              <StyledInput
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <StyledInput
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <StyledSelect
                value={accountType}
                onChange={(e) =>
                  setAccountType(
                    e.target.value as "listed_company" | "proxy_company",
                  )
                }>
                {ACCOUNT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </StyledSelect>
              <StyledInput
                type="text"
                placeholder="사용자명"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </InputGroup>

            <AgreeBlock>
              <AgreeLabel>
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                />
                <span>
                  <AgreeLink
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer">
                    개인정보처리방침
                  </AgreeLink>
                  에 동의합니다.
                </span>
              </AgreeLabel>
              <AgreeLabel>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span>
                  <AgreeLink
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer">
                    서비스이용약관
                  </AgreeLink>
                  에 동의합니다.
                </span>
              </AgreeLabel>
            </AgreeBlock>

            <LoginButton
              type="submit"
              disabled={isLoading || !agreePrivacy || !agreeTerms}>
              가입 신청
            </LoginButton>
            <SignUpLink href="/sign-in">
              이미 계정이 있으신가요? 로그인
            </SignUpLink>
            <SignUpLink
              href="/application-status"
              style={{ marginTop: "0.25rem" }}>
              신청 조회
            </SignUpLink>
          </LoginForm>
        </LoginContainer>

        <Footer>
          <FooterLinks>
            <FooterLink href="/privacy">개인정보처리방침</FooterLink>
            <span> · </span>
            <FooterLink href="/terms">서비스이용약관</FooterLink>
          </FooterLinks>
          <Copyright>
            <Font $size={12} color="#999">
              © 2024 ANTRE. All rights reserved.
            </Font>
          </Copyright>
        </Footer>
      </RightSection>
    </Container>
  )
}

export default SignUp

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  @media (max-width: 768px) {
    flex-direction: column;
  }
`

const LeftSection = styled.div`
  flex: 2;
  background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  color: white;
  @media (max-width: 768px) {
    flex: 1;
    padding: 2rem 1rem;
  }
`

const AnimationWrapper = styled.div`
  width: 100%;
  max-width: 500px;
  margin-bottom: 3rem;
  @media (max-width: 768px) {
    max-width: 300px;
    margin-bottom: 2rem;
  }
`

const ContentWrapper = styled.div`
  text-align: center;
  h1 {
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
    font-weight: 700;
    @media (max-width: 768px) {
      font-size: 1.8rem;
    }
  }
  p {
    font-size: 1.2rem;
    line-height: 1.6;
    opacity: 0.9;
    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }
`

const RightSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2rem;
  background-color: #ffffff;
  @media (max-width: 768px) {
    padding: 1rem;
  }
`

const LoginContainer = styled.div`
  margin: 0 auto;
  width: 100%;
  max-width: 400px;
  height: 100%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  @media (max-width: 768px) {
    padding: 1rem;
  }
`

const LogoWrapper = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  @media (max-width: 768px) {
    margin-bottom: 2rem;
  }
`

const LoginForm = styled.form`
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const AgreeBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const AgreeLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
  input {
    margin-top: 0.25rem;
    flex-shrink: 0;
  }
`

const AgreeLink = styled(Link)`
  color: #1a73e8;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

const StyledInput = styled.input`
  width: 100%;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  &:focus {
    border-color: #1a73e8;
    outline: none;
  }
`

const StyledSelect = styled.select`
  width: 100%;
  padding: 1rem 2.25rem 1rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  cursor: pointer;
  &:focus {
    border-color: #1a73e8;
    outline: none;
  }
`

const LoginButton = styled.button`
  width: 100%;
  padding: 1rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) {
    background-color: #1557b0;
  }
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`

const StyledDotSpinner = styled(DotSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`

const DoneMessage = styled.p`
  text-align: center;
  margin-bottom: 1.5rem;
  line-height: 1.6;
  color: #333;
`

const SignUpLink = styled(Link)`
  display: block;
  text-align: center;
  margin-top: 1rem;
  color: #1a73e8;
  font-size: 0.95rem;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

const Footer = styled.footer`
  text-align: center;
  padding: 2rem 0;
`

const FooterLinks = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  margin-bottom: 0.5rem;
`

const FooterLink = styled(Link)`
  color: #9ca3af;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
    color: #6b7280;
  }
`

const Copyright = styled.div`
  margin-top: 1rem;
`

export function getServerSideProps() {
  return { props: {} }
}
