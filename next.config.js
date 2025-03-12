/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: false,
  },
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  eslint: {
    dirs: ["."], // Only run ESLint on the 'pages' and 'utils' directories during production builds (next build)
  },
}

module.exports = nextConfig
