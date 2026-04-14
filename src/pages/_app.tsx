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
import { AuthStateSync } from "@/components/AuthStateSync"

import Script from "next/script"
import { ToastContainer } from "react-toastify"
import { reportError } from "@/lib/reportError"
import { getPublicSiteUrl } from "@/lib/siteUrl"

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
  const siteUrl = getPublicSiteUrl()

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

        <meta
          property="og:title"
          content="ANT:RE | 스마트한 주주 관리 서비스"
        />
        <meta
          property="og:description"
          content="주주 관리와 의결권 위임장 수집을 위한 올인원 서비스"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${siteUrl}/`} />
        <link rel="canonical" href={`${siteUrl}/`} />
        <meta property="og:image" content={`${siteUrl}/og-image.png`} />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />

        <meta name="theme-color" content="#8536FF" />
        <meta name="application-name" content="ANT:RE" />
      </Head>

      <GlobalStyle />

      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthStateSync />
          <HydrationBoundary state={dehydratedState}>
            <Component {...restPageProps} />
            <ToastContainer
              position="top-center"
              limit={3}
              autoClose={3000}
              style={{
                top: "max(12px, env(safe-area-inset-top, 0px))",
                width: "min(100%, calc(100vw - 24px))",
              }}
              toastStyle={{ borderRadius: "12px" }}
            />
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
