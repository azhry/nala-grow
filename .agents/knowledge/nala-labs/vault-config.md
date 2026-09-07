# Nala Labs Vault configuration

Vault is the runtime source of truth for service configuration and secrets.
NalaGrow should load its Casdoor configuration from the Vault KV record rather
than requiring Casdoor secrets in a checked-in dotenv file.

## Runtime boundary

Only the Vault transport/bootstrap values are needed before Vault can be
contacted. After authentication, the KV record supplies the application
configuration using the service's environment-style key names.

For NalaGrow, the Vault record should contain the Casdoor configuration bundle,
including the issuer, client/application identifiers, client secret, tenant and
application names, callback/audience values, enablement, and any server-side
user-management credential. Secrets remain process-local after loading.

The service may support explicit process environment overrides for controlled
local tests, but production deployment should use Vault. `backend/.env` is not
the source of truth for deployed configuration.

## Safety rules

- Never commit or print Vault tokens, AppRole credentials, client secrets,
  admin tokens, database URLs, or user passwords.
- Keep Casdoor configuration scoped to the NalaGrow organization/application.
- Read and write shared Vault configuration only through the approved
  `nala-infra` workflow, with non-secret endpoint metadata recorded for handoff.
- Treat a missing, stale, or unauthorized Vault record as a configuration
  blocker; do not fall back to fabricated Casdoor values.
