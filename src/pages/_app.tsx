import { useState, useEffect } from "react"
import GlobalStyle from "@/styles/global-style"
import Head from "next/head"
import { Hydrate, QueryClient, QueryClientProvider } from "react-query"
import { ReactQueryDevtools } from "react-query/devtools"
import { RecoilRoot } from "recoil"

import usePageLoading from "@/hooks/usePageLoading"
import GlobalSpinner from "@/component/global-spinner"

import isPropValid from "@emotion/is-prop-valid"
import Script from "next/script"
import { ToastContainer } from "react-toastify"

declare global {
  interface Window {
    kakao: any
    kakaoMapsLoaded: boolean
  }
}

const App = ({
  Component,
  pageProps,
}: {
  Component: React.ComponentType
  pageProps: any
}) => {
  const [queryClient] = useState(() => new QueryClient())
  const loading = usePageLoading()
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (window.kakao && !mapLoaded) {
      window.kakao.maps.load(() => {
        console.info("Kakao Maps API loaded successfully")
        setMapLoaded(true)
        window.kakaoMapsLoaded = true
      })
    }
  }, [mapLoaded])

  return (
    <>
      <Head>
        <title>ANT:RE | 스마트한 주주 관리 서비스</title>
        <meta
          name="description"
          content="ANT:RE는 효율적인 주주 관리와 의결권 위임장 수집을 위한 올인원 서비스입니다. 주주 현황 파악부터 위임장 수집 현장 관리까지, 더 스마트한 방식으로 진행하세요."
        />
        <meta
          name="keywords"
          content="주주명부관리,의결권위임장,주주총회,기업관리,스타트업"
        />

        {/* Open Graph Tags */}
        <meta
          property="og:title"
          content="ANT:RE | 스마트한 주주 관리 서비스"
        />
        <meta
          property="og:description"
          content="주주 관리와 의결권 위임장 수집을 위한 올인원 서비스"
        />
        <meta property="og:type" content="website" />
        {/* <meta property="og:url" content="https://antre.co.kr" /> */}
        <meta property="og:image" content="/og-image.png" />

        {/* Viewport */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
        />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* 추가 메타 태그 */}
        <meta name="theme-color" content="#8536FF" />
        <meta name="application-name" content="ANT:RE" />
      </Head>

      <GlobalStyle />

      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState}>
          <RecoilRoot>
            {loading ? (
              <GlobalSpinner
                width={18}
                height={18}
                marginRight={18}
                dotColor="#8536FF"
              />
            ) : (
              <Component {...pageProps} />
            )}
            <ToastContainer position="top-center" />
            <div id="portal" />
          </RecoilRoot>
        </Hydrate>

        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      </QueryClientProvider>

      <Script
        strategy="beforeInteractive"
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY}&libraries=services&autoload=false`}
        onLoad={() => {
          try {
            window.kakao.maps.load(() => {
              console.info("Initial Kakao Maps load")
              window.kakaoMapsLoaded = true
              setMapLoaded(true)
            })
          } catch (error) {
            console.error("Kakao Maps load error:", error)
          }
        }}
      />
    </>
  )
}

export default App
