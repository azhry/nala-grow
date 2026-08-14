const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const { loadVaultPublicEnv } = require("./vault-config")

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  }
}

describe("loadVaultPublicEnv", () => {
  test("preserves process-env fallback and filters it when Vault is disabled", async () => {
    const fetchImpl = jest.fn()
    const env = {
      NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1",
      NEXT_PUBLIC_GRAPHQL_URL: "http://localhost:4000/graphql",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
      VAULT_TOKEN: "do-not-return",
      DATABASE_URL: "postgres://backend-secret",
      UNEXPECTED_PUBLIC_VALUE: "do-not-return",
    }

    await expect(loadVaultPublicEnv(env, fetchImpl)).resolves.toEqual({
      NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1",
      NEXT_PUBLIC_GRAPHQL_URL: "http://localhost:4000/graphql",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test("reads Vault transport from a repository-root .vault-config when process env is absent", async () => {
    const workingDir = fs.mkdtempSync(path.join(os.tmpdir(), "nala-grow-vault-config-"))
    try {
      fs.writeFileSync(
        path.join(workingDir, ".vault-config"),
        "VAULT_ADDR=https://vault.example.test\nVAULT_TOKEN=file-token\nVAULT_KV_PATH=apps/nala-grow\nIGNORED=not-loaded\n",
        { mode: 0o600 },
      )
      const fetchImpl = jest.fn().mockResolvedValue(
        jsonResponse({
          data: {
            data: {
              NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1",
              NEXT_PUBLIC_GRAPHQL_URL: "https://api.example.test/graphql",
              NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
            },
          },
        }),
      )

      await expect(loadVaultPublicEnv({}, fetchImpl, workingDir)).resolves.toEqual({
        NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1",
        NEXT_PUBLIC_GRAPHQL_URL: "https://api.example.test/graphql",
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
      })
      expect(fetchImpl).toHaveBeenCalledWith(
        "https://vault.example.test/v1/secret/data/apps/nala-grow",
        { headers: { Accept: "application/json", "X-Vault-Token": "file-token" } },
      )
    } finally {
      fs.rmSync(workingDir, { recursive: true, force: true })
    }
  })

  test("reads the default KV v2 path with a token and returns only public keys", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        data: {
          data: {
            NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1",
            NEXT_PUBLIC_GRAPHQL_URL: "https://api.example.test/graphql",
            NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
            DATABASE_URL: "postgres://backend-secret",
            GOOGLE_CLIENT_SECRET: "backend-secret",
          },
        },
      }),
    )
    const env = { VAULT_ADDR: "https://vault.example.test/", VAULT_TOKEN: "vault-token" }

    const publicEnv = await loadVaultPublicEnv(env, fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://vault.example.test/v1/secret/data/nala-labs/nala-grow",
      { headers: { Accept: "application/json", "X-Vault-Token": "vault-token" } },
    )
    expect(publicEnv).toEqual({
      NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1",
      NEXT_PUBLIC_GRAPHQL_URL: "https://api.example.test/graphql",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
    })
    expect(JSON.stringify(publicEnv)).not.toContain("vault-token")
    expect(JSON.stringify(publicEnv)).not.toContain("backend-secret")
  })

  test("authenticates with AppRole before reading a custom KV v2 path", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ auth: { client_token: "approle-client-token" } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            data: {
              NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1",
              NEXT_PUBLIC_GRAPHQL_URL: "https://api.example.test/graphql",
              NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
            },
          },
        }),
      )
    const env = {
      VAULT_ADDR: "https://vault.example.test",
      VAULT_KV_MOUNT: "kv",
      VAULT_KV_PATH: "apps/nala-grow",
      VAULT_ROLE_ID: "role-id",
      VAULT_SECRET_ID: "secret-id",
    }

    await expect(loadVaultPublicEnv(env, fetchImpl)).resolves.toEqual({
      NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1",
      NEXT_PUBLIC_GRAPHQL_URL: "https://api.example.test/graphql",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
    })
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://vault.example.test/v1/auth/approle/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ role_id: "role-id", secret_id: "secret-id" }),
      }),
    )
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://vault.example.test/v1/kv/data/apps/nala-grow",
      { headers: { Accept: "application/json", "X-Vault-Token": "approle-client-token" } },
    )
  })

  test("fails clearly when Vault transport fails without leaking the credential", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error("network failed for vault-token"))

    await expect(
      loadVaultPublicEnv(
        { VAULT_ADDR: "https://vault.example.test", VAULT_TOKEN: "vault-token" },
        fetchImpl,
      ),
    ).rejects.toThrow("Vault transport error during reading the Vault KV v2 secret.")
    await expect(
      loadVaultPublicEnv(
        { VAULT_ADDR: "https://vault.example.test", VAULT_TOKEN: "vault-token" },
        fetchImpl,
      ),
    ).rejects.not.toThrow("vault-token")
  })

  test("fails clearly on Vault authentication errors", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ errors: ["denied"] }, 403))

    await expect(
      loadVaultPublicEnv(
        {
          VAULT_ADDR: "https://vault.example.test",
          VAULT_ROLE_ID: "role-id",
          VAULT_SECRET_ID: "secret-id",
        },
        fetchImpl,
      ),
    ).rejects.toThrow("Vault authentication error during authenticating with Vault AppRole (HTTP 403).")
  })

  test("fails clearly on malformed Vault JSON", async () => {
    const response = jsonResponse(null)
    response.json.mockRejectedValue(new Error("invalid JSON"))
    const fetchImpl = jest.fn().mockResolvedValue(response)

    await expect(
      loadVaultPublicEnv(
        { VAULT_ADDR: "https://vault.example.test", VAULT_TOKEN: "vault-token" },
        fetchImpl,
      ),
    ).rejects.toThrow("Vault JSON error while reading the Vault KV v2 secret.")
  })

  test("fails clearly when a required public key is absent", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        data: {
          data: {
            NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1",
            DATABASE_URL: "backend-secret",
          },
        },
      }),
    )

    await expect(
      loadVaultPublicEnv(
        { VAULT_ADDR: "https://vault.example.test", VAULT_TOKEN: "vault-token" },
        fetchImpl,
      ),
    ).rejects.toThrow(
      "Vault configuration error: missing required public key(s): NEXT_PUBLIC_GRAPHQL_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID.",
    )
  })
})

test("Next config exposes only the public allowlist", async () => {
  const originalEnv = process.env
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1",
    NEXT_PUBLIC_GRAPHQL_URL: "http://localhost:4000/graphql",
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
    DATABASE_URL: "backend-secret",
  }
  delete process.env.VAULT_ADDR

  jest.resetModules()
  const nextConfig = require("../next.config")
  const resolvedConfig = await nextConfig()

  expect(resolvedConfig.env).toEqual({
    NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1",
    NEXT_PUBLIC_GRAPHQL_URL: "http://localhost:4000/graphql",
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-client-id",
  })
  expect(JSON.stringify(resolvedConfig)).not.toContain("backend-secret")

  process.env = originalEnv
})
