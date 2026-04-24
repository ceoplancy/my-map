import { Html, Head, Main, NextScript } from "next/document"

const CustomDocument = () => {
  return (
    <Html>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="apple-touch-icon" href="/antre-logo-square.png" />
        <meta name="theme-color" content="#8536FF" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

export default CustomDocument
