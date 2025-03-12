/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  eslint: {
    dirs: ["."], // Only run ESLint on the 'pages' and 'utils' directories during production builds (next build)
  },
  compiler: {
    styledComponents: {
      ssr: true,
      displayName: true,
      preprocess: false,
    },
  },
}

module.exports = nextConfig
