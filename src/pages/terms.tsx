import Head from "next/head"
import Link from "next/link"
import styled from "@emotion/styled"

const Page = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: #374151;
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1.5rem;
`

const Section = styled.section`
  margin-bottom: 1.5rem;
`

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
`

const List = styled.ul`
  margin: 0.5rem 0 0 1.25rem;
  padding: 0;
`

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: 1.5rem;
  color: #1a73e8;
  text-decoration: none;
  font-size: 0.875rem;
  &:hover {
    text-decoration: underline;
  }
`

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>서비스이용약관 | ANT:RE</title>
      </Head>
      <Page>
        <BackLink href="/sign-up">← 회원가입으로</BackLink>
        <Title>서비스이용약관</Title>
        <p>
          ANT:RE(앤트리맵) 서비스를 이용해 주셔서 감사합니다. 본 약관에 동의하신
          후 서비스를 이용할 수 있습니다.
        </p>

        <Section>
          <SectionTitle>제1조 (목적)</SectionTitle>
          <p>
            본 약관은 ANT:RE가 제공하는 주주명부·워크스페이스 관리 등 서비스의
            이용 조건 및 절차, 이용자와 운영사의 권리·의무를 정합니다.
          </p>
        </Section>

        <Section>
          <SectionTitle>제2조 (가입 및 승인)</SectionTitle>
          <p>
            회원가입 신청 후 운영사(서비스 관리자)의 승인이 완료되어야 서비스를
            이용할 수 있습니다. 승인 전에는 가입 대기 상태이며, 신청 조회를 통해
            상태를 확인할 수 있습니다.
          </p>
        </Section>

        <Section>
          <SectionTitle>제3조 (서비스 이용)</SectionTitle>
          <p>
            이용자는 승인된 계정으로 로그인하여 워크스페이스 생성·관리, 주주명부
            관리, 의결권 위임장 수집 등 서비스 기능을 이용할 수 있습니다. 이용
            시 관련 법령 및 운영 정책을 준수하여야 합니다.
          </p>
        </Section>

        <Section>
          <SectionTitle>제4조 (금지 행위)</SectionTitle>
          <List>
            <li>타인의 계정·정보 도용, 서비스 무단 이용</li>
            <li>서비스 시스템 방해, 역설계·크롤링 등 부정 사용</li>
            <li>법령 또는 공서양속에 반하는 행위</li>
          </List>
        </Section>

        <Section>
          <SectionTitle>제5조 (서비스 변경·중단)</SectionTitle>
          <p>
            운영사는 사전 공지 후 서비스 내용을 변경하거나 일시·영구 중단할 수
            있으며, 불가피한 경우 사후 공지할 수 있습니다.
          </p>
        </Section>

        <Section>
          <SectionTitle>제6조 (약관 변경)</SectionTitle>
          <p>
            약관 변경 시 서비스 내 공지 또는 이메일 등으로 안내하며, 변경 후
            이용 시 동의한 것으로 봅니다.
          </p>
        </Section>

        <BackLink href="/sign-up">← 회원가입으로</BackLink>
      </Page>
    </>
  )
}
