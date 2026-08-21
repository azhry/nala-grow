"use strict"

const fs = require("node:fs")
const path = require("node:path")

const REQUIRED_PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GRAPHQL_URL",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
]

// Casdoor is a separately enabled auth provider. Keep its public identifiers
// available to Next.js when configured, but do not make legacy/local Vault
// deployments fail merely because Casdoor has not been enabled yet.
const OPTIONAL_PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_CASDOOR_ISSUER",
  "NEXT_PUBLIC_CASDOOR_CLIENT_ID",
  "NEXT_PUBLIC_CASDOOR_ORGANIZATION",
  "NEXT_PUBLIC_CASDOOR_APPLICATION",
  "NEXT_PUBLIC_CASDOOR_REDIRECT_URI",
  "NEXT_PUBLIC_CASDOOR_AUTHORIZATION_URL",
]

const PUBLIC_ENV_KEYS = [...REQUIRED_PUBLIC_ENV_KEYS, ...OPTIONAL_PUBLIC_ENV_KEYS]

const VAULT_CONFIG_KEYS = [
  "VAULT_ADDR",
  "VAULT_TOKEN",
  "VAULT_ROLE_ID",
  "VAULT_SECRET_ID",
  "VAULT_KV_MOUNT",
  "VAULT_KV_PATH",
]

const VAULT_CONFIG_KEY_SET = new Set(VAULT_CONFIG_KEYS)
const DEFAULT_KV_MOUNT = "secret"
const DEFAULT_KV_PATH = "nala-labs/nala-grow"

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0
}

function getPublicProcessEnv(env) {
  return Object.fromEntries(
    PUBLIC_ENV_KEYS.filter((key) => env[key] !== undefined).map((key) => [key, env[key]]),
  )
}

function parseVaultConfig(contents) {
  const values = {}

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match || !VAULT_CONFIG_KEY_SET.has(match[1])) {
      continue
    }

    const value = match[2]
    values[match[1]] =
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
        ? value.slice(1, -1)
        : value
  }

  return values
}

function readVaultConfig(startDirectory = process.cwd()) {
  let directory = path.resolve(startDirectory)

  while (true) {
    const configPath = path.join(directory, ".vault-config")
    if (fs.existsSync(configPath)) {
      try {
        return parseVaultConfig(fs.readFileSync(configPath, "utf8"))
      } catch {
        throw new Error("Vault configuration error: unable to read .vault-config.")
      }
    }

    const parentDirectory = path.dirname(directory)
    if (parentDirectory === directory) {
      return {}
    }
    directory = parentDirectory
  }
}

function mergeVaultConfig(env, fileValues) {
  const merged = { ...env }

  for (const key of VAULT_CONFIG_KEYS) {
    if (merged[key] === undefined && fileValues[key] !== undefined) {
      merged[key] = fileValues[key]
    }
  }

  return merged
}

function normalizeVaultAddress(address) {
  const normalized = address.trim().replace(/\/+$/, "")

  try {
    const url = new URL(normalized)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol")
    }
  } catch {
    throw new Error("Vault transport error: VAULT_ADDR must be an absolute HTTP(S) URL.")
  }

  return normalized
}

function normalizeVaultPath(value, fallback, variableName) {
  const normalized = (hasValue(value) ? value : fallback)
    .trim()
    .replace(/^\/+|\/+$/g, "")

  if (!normalized || normalized.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Vault transport error: ${variableName} is not a valid Vault path.`)
  }

  return normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

function getFetch(fetchImpl) {
  const request = fetchImpl || globalThis.fetch
  if (typeof request !== "function") {
    throw new Error("Vault transport error: fetch is unavailable in the Node.js runtime.")
  }
  return request
}

function getHttpError(stage, response) {
  const status = Number.isInteger(response && response.status) ? ` (HTTP ${response.status})` : ""
  const isAuthFailure = response && (response.status === 401 || response.status === 403)
  const category = isAuthFailure ? "authentication" : "transport"
  return new Error(`Vault ${category} error during ${stage}${status}.`)
}

async function requestJson(fetchImpl, url, options, stage) {
  let response
  try {
    response = await fetchImpl(url, options)
  } catch {
    throw new Error(`Vault transport error during ${stage}.`)
  }

  if (!response || !response.ok) {
    throw getHttpError(stage, response)
  }

  try {
    return await response.json()
  } catch {
    throw new Error(`Vault JSON error while ${stage}.`)
  }
}

async function getVaultToken(env, fetchImpl) {
  if (hasValue(env.VAULT_TOKEN)) {
    return env.VAULT_TOKEN
  }

  if (!hasValue(env.VAULT_ROLE_ID) || !hasValue(env.VAULT_SECRET_ID)) {
    throw new Error(
      "Vault authentication error: configure VAULT_TOKEN or both VAULT_ROLE_ID and VAULT_SECRET_ID.",
    )
  }

  const address = normalizeVaultAddress(env.VAULT_ADDR)
  const response = await requestJson(
    fetchImpl,
    `${address}/v1/auth/approle/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        role_id: env.VAULT_ROLE_ID,
        secret_id: env.VAULT_SECRET_ID,
      }),
    },
    "authenticating with Vault AppRole",
  )

  const clientToken = response && response.auth && response.auth.client_token
  if (!hasValue(clientToken)) {
    throw new Error("Vault authentication error: AppRole login did not return a client token.")
  }

  return clientToken
}

async function loadVaultPublicEnv(env = process.env, fetchImpl, startDirectory = process.cwd()) {
  const resolvedEnv = mergeVaultConfig(env, readVaultConfig(startDirectory))

  if (!hasValue(resolvedEnv.VAULT_ADDR)) {
    return getPublicProcessEnv(env)
  }

  const request = getFetch(fetchImpl)
  const address = normalizeVaultAddress(resolvedEnv.VAULT_ADDR)
  const mount = normalizeVaultPath(resolvedEnv.VAULT_KV_MOUNT, DEFAULT_KV_MOUNT, "VAULT_KV_MOUNT")
  const vaultPath = normalizeVaultPath(resolvedEnv.VAULT_KV_PATH, DEFAULT_KV_PATH, "VAULT_KV_PATH")
  const token = await getVaultToken(resolvedEnv, request)
  const response = await requestJson(
    request,
    `${address}/v1/${mount}/data/${vaultPath}`,
    { headers: { Accept: "application/json", "X-Vault-Token": token } },
    "reading the Vault KV v2 secret",
  )

  const values = response && response.data && response.data.data
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("Vault JSON error while reading the Vault KV v2 secret: missing data object.")
  }

  const missingKeys = REQUIRED_PUBLIC_ENV_KEYS.filter((key) => !hasValue(values[key]))
  if (missingKeys.length > 0) {
    throw new Error(`Vault configuration error: missing required public key(s): ${missingKeys.join(", ")}.`)
  }

  return Object.fromEntries(
    PUBLIC_ENV_KEYS
      .filter((key) => values[key] !== undefined && (REQUIRED_PUBLIC_ENV_KEYS.includes(key) || hasValue(values[key])))
      .map((key) => [key, values[key]]),
  )
}

module.exports = {
  DEFAULT_KV_MOUNT,
  DEFAULT_KV_PATH,
  OPTIONAL_PUBLIC_ENV_KEYS,
  PUBLIC_ENV_KEYS,
  loadVaultPublicEnv,
}
