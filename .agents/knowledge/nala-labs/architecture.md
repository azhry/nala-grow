# Nala Labs platform architecture

The shared Nala Labs platform runs in the `nala-labs` Kubernetes namespace.
Ingress and Cloudflare connector components run in their own namespaces.

## Public platform services

| Service | Public endpoint | Purpose |
| --- | --- | --- |
| Casdoor | `https://casdoor.nalanirvana.com` and the Windows route | Identity, SSO/OIDC, OAuth, and user management |
| Vault | `https://vault.nalanirvana.com` and the Windows route | Runtime configuration and secret storage |
| Flagr | `https://flagr.nalanirvana.com` and the Windows route | Feature-flag evaluation |

Public lab services must remain protected by the platform's access controls.

## Internal services

| Service | Kubernetes address | Port |
| --- | --- | ---: |
| Shared PostgreSQL | `postgresql.nala-labs.svc.cluster.local` | 5432 |
| Future-app PostgreSQL | `postgresql-app.nala-labs.svc.cluster.local` | 5432 |
| Casdoor | `casdoor.nala-labs.svc.cluster.local` | 8000 |
| Vault | `vault.nala-labs.svc.cluster.local` | 8200 |
| Redis | `redis-master.nala-labs.svc.cluster.local` | 6379 |
| Kafka | `kafka.nala-labs.svc.cluster.local` | 9092 |
| Flagr | `flagr.nala-labs.svc.cluster.local` | 18000 |

Casdoor and Flagr use separate databases in the shared PostgreSQL release.
NalaGrow application data must stay in its own application database; it must
not be mixed into Casdoor's database.

## Request routing

1. The public hostname resolves through the Cloudflare tunnel.
2. Cloudflare forwards to the NGINX ingress controller.
3. NGINX selects the Kubernetes service using the HTTP Host header.
4. Internal applications use Kubernetes service DNS names, or an approved
   public/loopback endpoint when running outside the cluster.

Useful non-mutating inspection commands:

```bash
kubectl -n nala-labs get pods -o wide
kubectl -n nala-labs get svc
kubectl -n nala-labs get ingress
helm -n nala-labs list
```
