# Nala Labs platform defaults

This file records only non-secret platform defaults needed to reason about the
NalaGrow integration. Effective values may be overridden by the deployment.

## Cluster

- Kubernetes namespace: `nala-labs`
- Casdoor service: `casdoor.nala-labs.svc.cluster.local:8000`
- Vault service: `vault.nala-labs.svc.cluster.local:8200`
- Public Casdoor host: `https://casdoor.nalanirvana.com`
- Public Vault host: `https://vault.nalanirvana.com`

## PostgreSQL

- Shared platform service: `postgresql.nala-labs.svc.cluster.local:5432`
- Casdoor database: `casdoor`
- NalaGrow application data belongs in the application's own database, not in
  the Casdoor database.
- A loopback port-forward may be used for controlled local inspection:

```bash
kubectl -n nala-labs port-forward svc/postgresql 25432:5432
```

## Vault

- Runtime configuration is loaded from the approved Vault KV record.
- Local development may use a secure `.vault-config` transport file containing
  only Vault connection/authentication bootstrap values.
- Casdoor client secrets, admin tokens, database credentials, and user
  passwords must be resolved at runtime and must not be copied here.

## Test accounts

The authoritative NalaGrow test-account records remain in the existing local
knowledge source. Provision them in the NalaGrow Casdoor organization through
the approved runtime workflow; do not duplicate their passwords in this
platform reference.

The shared Casdoor tenant currently uses these canonical fixture identities:

| Casdoor account | NalaGrow role |
| --- | --- |
| `nala-admin-test` | `Admin` |
| `nala-auth-test` | `Parent` |
| `nala-developer-test` | `Parent` |
| `nala-free-test` | `Parent` |

The account names are fixture identifiers, not product tiers. NalaGrow must
not create or depend on `free` or `developer` roles. Passwords remain in the
approved sibling-project knowledge source and are never copied here.
