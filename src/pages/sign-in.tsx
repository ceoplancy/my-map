import { useState } from "react"
import { usePostSignIn } from "@/api/auth"
import styled from "@emotion/styled"
import Button from "@/component/button"
import DotSpinner from "@/component/dot-spinner"
import Font from "@/component/font"
import Image from "next/image"
import { SignInAnimation } from "@/components/animations/SignInAnimation"

const SignIn = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { mutate: signInMutate, isLoading: signInIsLoading } = usePostSignIn()

  return (
    <Container>
      <LeftSection>
        <AnimationWrapper>
          <SignInAnimation />
        </AnimationWrapper>
        <ContentWrapper>
          <h1>주주명부 관리를 더 스마트하게</h1>
          <p>
            디지털 방식으로 주주명부를 관리하고,
            <br />
            효율적으로 주주들과 소통하세요.
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
              priority
            />
          </LogoWrapper>

          <LoginForm
            onSubmit={(e) => {
              e.preventDefault()
              signInMutate({ email, password })
            }}>
            {signInIsLoading && <StyledDotSpinner />}

            <InputGroup>
              <StyledInput
                type="text"
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
            </InputGroup>

            <LoginButton type="submit">로그인</LoginButton>
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

export default SignIn

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
      margin-bottom: 1rem;
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

    img {
      max-width: 150px !important;
    }
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
  transition: all 0.2s ease;

  &:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
    outline: none;
  }
`

const LoginButton = styled(Button)`
  width: 100%;
  padding: 1rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #1557b0;
  }
`

const StyledDotSpinner = styled(DotSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`

const Footer = styled.footer`
  text-align: center;
  padding: 2rem 0;
`

const CompanyInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  opacity: 0.8;
`

const Copyright = styled.div`
  margin-top: 1rem;
`
