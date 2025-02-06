/** @type {import('next').NextConfig} */

import withInterceptStdout from "next-intercept-stdout";

const nextConfig = withInterceptStdout(
  {
    reactStrictMode: true,
    experimental: {
      forceSwcTransforms: true,
    },
    compiler: {
      styledComponents: true,
    },
    images: {
      domains: ["my-map.pockethost.io"],
      formats: ["image/avif", "image/webp"],
    },
    webpack(config, options) {
      config.module.rules.push({
        test: /\.mp3$/,
        use: {
          loader: "file-loader",
        },
      });
      return config;
    },
  },
  (text) => (text.includes("Duplicate atom key") ? "" : text)
);

export default nextConfig;
