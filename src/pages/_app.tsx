import { useState, useEffect, useCallback } from "react"
import GlobalStyle from "@/styles/global-style"
import Head from "next/head"
import {
  type DehydratedState,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ErrorBoundary } from "@/components/ErrorBoundary"

import Script from "next/script"
import { ToastContainer } from "react-toastify"
import { reportError } from "@/lib/reportError"

declare global {
  interface Window {
    kakao: {
      maps: {
        services: {
          Geocoder: new () => any
          Places: new () => any
          Status: any
        }
        load: () => void
      }
    }
    kakaoMapsLoaded?: boolean
  }
}

type AppProps = {
  Component: React.ComponentType
  pageProps: Record<string, unknown> & {
    dehydratedState?: DehydratedState
  }
}

const queryClientOptions = {
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 300_000,
    },
  },
}
const App = ({ Component, pageProps }: AppProps) => {
  const { dehydratedState, ...restPageProps } = pageProps
  const [queryClient] = useState(() => new QueryClient(queryClientOptions))

  // 카카오맵 로딩: 스크립트 로드 후 초기화. 맵이 필요한 페이지는 window.kakao / useKakaoMaps 사용.
  const initializeKakaoMap = useCallback(() => {
    if (!window.kakao) return
    try {
      window.kakao.maps.load(() => {
        if (process.env.NODE_ENV === "development") {
          console.info("Kakao Maps API loaded successfully")
        }
        window.kakaoMapsLoaded = true
      })
    } catch (error) {
      reportError(error)
    }
  }, [])

  useEffect(() => {
    initializeKakaoMap()
  }, [initializeKakaoMap])

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
        <meta property="og:image" content="/antre-logo-square.png" />

        {/* Viewport */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
        />

        {/* Favicon - only link assets that exist in public/ */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* 추가 메타 태그 */}
        <meta name="theme-color" content="#8536FF" />
        <meta name="application-name" content="ANT:RE" />
      </Head>

      <GlobalStyle />

      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <HydrationBoundary state={dehydratedState}>
            <Component {...restPageProps} />
            <ToastContainer position="top-center" limit={3} autoClose={3000} />
            <div id="portal" />
          </HydrationBoundary>
          {process.env.NODE_ENV === "development" && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </ErrorBoundary>

      {process.env.NEXT_PUBLIC_KAKAO_APP_KEY && (
        <Script
          strategy="afterInteractive"
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY}&libraries=services&autoload=false`}
          onError={(e) => console.error("Kakao Maps script load error:", e)}
          onLoad={initializeKakaoMap}
        />
      )}
    </>
  )
}

export default App
