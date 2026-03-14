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
  const [workspaceName, setWorkspaceName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !workspaceName) {
      toast.error("이메일, 비밀번호, 워크스페이스명을 입력해 주세요.")

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
          workspace_name: workspaceName,
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
                src="/entre-logo-full.png"
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
              src="/entre-logo-full.png"
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
                placeholder="워크스페이스명 (회사명 등)"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </InputGroup>

            <LoginButton type="submit" disabled={isLoading}>
              가입 신청
            </LoginButton>
            <SignUpLink href="/sign-in">
              이미 계정이 있으신가요? 로그인
            </SignUpLink>
          </LoginForm>
        </LoginContainer>

        <Footer>
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
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
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

const Copyright = styled.div`
  margin-top: 1rem;
`

export function getServerSideProps() {
  return { props: {} }
}
