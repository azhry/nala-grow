# Nala Labs agent knowledge

Use these references when changing NalaGrow integrations with the shared Nala
Labs platform:

| Reference | Read for |
| --- | --- |
| [Architecture](architecture.md) | Cluster topology, services, namespaces, routing, and dependency relationships. |
| [Authentication](authentication.md) | Shared Casdoor identity, organization isolation, claims, and migration rules. |
| [Defaults](defaults.md) | Non-secret endpoints, service names, databases, and port-forward targets. |
| [Vault configuration](vault-config.md) | Runtime configuration source, KV path conventions, and secret handling. |

This copy intentionally excludes passwords, tokens, client secrets, database
connection strings, and other credentials. Resolve those through the approved
Vault or `nala-infra` workflow at runtime.
