import Head from "next/head"
import Link from "next/link"

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 | ANT:RE</title>
      </Head>
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          padding:
            "max(2rem, env(safe-area-inset-top)) max(2rem, env(safe-area-inset-right)) max(2rem, env(safe-area-inset-bottom)) max(2rem, env(safe-area-inset-left))",
          textAlign: "center",
          boxSizing: "border-box",
        }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          페이지를 찾을 수 없습니다
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
          요청하신 경로가 존재하지 않습니다.
        </p>
        <Link
          href="/"
          style={{
            color: "#8536FF",
            fontWeight: 600,
            textDecoration: "underline",
          }}>
          홈으로 돌아가기
        </Link>
      </main>
    </>
  )
}
