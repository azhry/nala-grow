export const PUBLIC_RUNTIME_CONFIG_SCRIPT_ID = "nala-grow-public-runtime-config"

export const PUBLIC_RUNTIME_CONFIG_KEYS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GRAPHQL_URL",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
  "NEXT_PUBLIC_CASDOOR_ISSUER",
  "NEXT_PUBLIC_CASDOOR_CLIENT_ID",
  "NEXT_PUBLIC_CASDOOR_ORGANIZATION",
  "NEXT_PUBLIC_CASDOOR_APPLICATION",
  "NEXT_PUBLIC_CASDOOR_REDIRECT_URI",
  "NEXT_PUBLIC_CASDOOR_AUTHORIZATION_URL",
] as const

export type PublicRuntimeConfigKey = (typeof PUBLIC_RUNTIME_CONFIG_KEYS)[number]
export type PublicRuntimeConfig = Partial<Record<PublicRuntimeConfigKey, string>>

let cachedConfig: PublicRuntimeConfig | undefined

function readTestEnvironment(): PublicRuntimeConfig {
  if (process.env.NODE_ENV !== "test") return {}

  const config: PublicRuntimeConfig = {}
  for (const key of PUBLIC_RUNTIME_CONFIG_KEYS) {
    const value = process.env[key]
    if (typeof value === "string") config[key] = value
  }
  return config
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  if (process.env.NODE_ENV === "test") return readTestEnvironment()
  if (cachedConfig) return cachedConfig
  if (typeof document === "undefined") return readTestEnvironment()

  const element = document.getElementById(PUBLIC_RUNTIME_CONFIG_SCRIPT_ID)
  if (!element?.textContent) {
    cachedConfig = readTestEnvironment()
    return cachedConfig
  }

  try {
    const parsed: unknown = JSON.parse(element.textContent)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      cachedConfig = {}
      return cachedConfig
    }

    const config: PublicRuntimeConfig = {}
    for (const key of PUBLIC_RUNTIME_CONFIG_KEYS) {
      const value = Reflect.get(parsed, key)
      if (typeof value === "string") config[key] = value
    }
    cachedConfig = config
  } catch {
    cachedConfig = {}
  }

  return cachedConfig
}
