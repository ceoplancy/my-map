/** 프로덕션 메인 배포 (Vercel 프로젝트 antre-map) */
const DEFAULT_PRODUCTION_SITE = "https://antre-map.vercel.app"

/**
 * OG/canonical용 공개 URL. 명시 env > Vercel 호스트 > 로컬/폴백
 * @see https://vercel.com/docs/projects/environment-variables/system-environment-variables
 */
function resolvePublicSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel)
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
  if (process.env.NODE_ENV === "development") return "http://localhost:3000"
  return DEFAULT_PRODUCTION_SITE
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SITE_URL: resolvePublicSiteUrl(),
  },
  experimental: {
    forceSwcTransforms: false,
  },
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  eslint: {
    dirs: ["."],
  },
  async rewrites() {
    return [
      { source: "/favicon-16x16.png", destination: "/favicon.ico" },
      { source: "/favicon-32x32.png", destination: "/favicon.ico" },
    ]
  },
}

module.exports = nextConfig

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs")

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "my-map",
  project: "react",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
})
