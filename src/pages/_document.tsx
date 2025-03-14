import { Html, Head, Main, NextScript } from "next/document"

const CustomDocument = () => {
  return (
    <Html>
      <Head>
        <link rel="manifest" href="/site.webmanifest" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

export default CustomDocument
