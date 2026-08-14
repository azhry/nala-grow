"use strict"

const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GRAPHQL_URL",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
]

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

async function loadVaultPublicEnv(env = process.env, fetchImpl) {
  if (!hasValue(env.VAULT_ADDR)) {
    return getPublicProcessEnv(env)
  }

  const request = getFetch(fetchImpl)
  const address = normalizeVaultAddress(env.VAULT_ADDR)
  const mount = normalizeVaultPath(env.VAULT_KV_MOUNT, DEFAULT_KV_MOUNT, "VAULT_KV_MOUNT")
  const path = normalizeVaultPath(env.VAULT_KV_PATH, DEFAULT_KV_PATH, "VAULT_KV_PATH")
  const token = await getVaultToken(env, request)
  const response = await requestJson(
    request,
    `${address}/v1/${mount}/data/${path}`,
    { headers: { Accept: "application/json", "X-Vault-Token": token } },
    "reading the Vault KV v2 secret",
  )

  const values = response && response.data && response.data.data
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("Vault JSON error while reading the Vault KV v2 secret: missing data object.")
  }

  const missingKeys = PUBLIC_ENV_KEYS.filter((key) => !hasValue(values[key]))
  if (missingKeys.length > 0) {
    throw new Error(`Vault configuration error: missing required public key(s): ${missingKeys.join(", ")}.`)
  }

  return Object.fromEntries(PUBLIC_ENV_KEYS.map((key) => [key, values[key]]))
}

module.exports = {
  DEFAULT_KV_MOUNT,
  DEFAULT_KV_PATH,
  PUBLIC_ENV_KEYS,
  loadVaultPublicEnv,
}
