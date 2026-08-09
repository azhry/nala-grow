/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    webpackBuildWorker: false,
  },
}

module.exports = nextConfig
