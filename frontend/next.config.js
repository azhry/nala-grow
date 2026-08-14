const { loadVaultPublicEnv } = require("./scripts/vault-config")

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    webpackBuildWorker: false,
  },
}

module.exports = async () => ({
  ...nextConfig,
  env: await loadVaultPublicEnv(),
})
