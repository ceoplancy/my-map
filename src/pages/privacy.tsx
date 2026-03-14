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

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>개인정보처리방침 | ANT:RE</title>
      </Head>
      <Page>
        <BackLink href="/sign-up">← 회원가입으로</BackLink>
        <Title>개인정보처리방침</Title>
        <p>
          ANT:RE(앤트리맵)는 이용자의 개인정보를 보호하며 관련 법령을
          준수합니다.
        </p>

        <Section>
          <SectionTitle>1. 수집하는 개인정보 항목</SectionTitle>
          <p>서비스 가입·이용·관리 과정에서 아래 정보를 수집할 수 있습니다.</p>
          <List>
            <li>필수: 이메일 주소, 비밀번호, 사용자명(가입 시)</li>
            <li>선택: 프로필 정보(이름 등)</li>
            <li>자동 수집: 서비스 이용 기록, 접속 로그, 기기 정보</li>
            <li>
              워크스페이스·주주명부 관리 시: 워크스페이스명, 주주 정보(이름,
              주소, 연락처 등 명부에 입력된 내용)
            </li>
          </List>
        </Section>

        <Section>
          <SectionTitle>2. 수집 목적</SectionTitle>
          <p>
            회원 인증, 가입 승인 처리, 워크스페이스·주주명부 관리 서비스 제공,
            이용자 지원 및 서비스 개선에 사용됩니다.
          </p>
        </Section>

        <Section>
          <SectionTitle>3. 보유 및 이용 기간</SectionTitle>
          <p>
            회원 탈퇴 또는 동의 철회 시까지 보유하며, 관계 법령에 따라 보존이
            필요한 경우 해당 기간 동안 보관합니다.
          </p>
        </Section>

        <Section>
          <SectionTitle>4. 제3자 제공</SectionTitle>
          <p>
            이용자 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에
            따른 요청이 있는 경우 등 법적 의무 이행 시에는 예외로 합니다.
          </p>
        </Section>

        <Section>
          <SectionTitle>5. 이용자 권리</SectionTitle>
          <p>
            이용자는 개인정보 열람·정정·삭제·처리 정지를 요청할 수 있으며,
            서비스 내 설정 또는 운영사 문의를 통해 행사할 수 있습니다.
          </p>
        </Section>

        <Section>
          <SectionTitle>6. 문의</SectionTitle>
          <p>
            개인정보 처리와 관련한 문의는 서비스 내 공지 또는 운영사 연락처로
            요청하시기 바랍니다.
          </p>
        </Section>

        <BackLink href="/sign-up">← 회원가입으로</BackLink>
      </Page>
    </>
  )
}
