import styled from "@emotion/styled"

const Container = styled.div`
  display: flex;
  height: 100vh;
  align-items: center;
  justify-content: center;
  background-color: #fff;
`

const Content = styled.div`
  text-align: center;
`

const Spinner = styled.div`
  animation: spin 1s linear infinite;
  margin: 0 auto;
  height: 3rem;
  width: 3rem;
  border-radius: 9999px;
  border: 2px solid #e5e7eb;
  border-top-color: #111827;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const Message = styled.p`
  margin-top: 1rem;
  font-size: 0.9375rem;
  color: #6b7280;
`

interface FullPageLoaderProps {
  message?: string
}

export function FullPageLoader({
  message = "로딩 중...",
}: FullPageLoaderProps) {
  return (
    <Container>
      <Content>
        <Spinner />
        <Message>{message}</Message>
      </Content>
    </Container>
  )
}
