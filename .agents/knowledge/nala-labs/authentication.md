# Nala Labs authentication

Nala Labs uses Casdoor as the identity, SSO/OIDC, and role source. NalaGrow
should consume the existing Casdoor deployment instead of running another
Casdoor instance.

## NalaGrow tenant boundary

NalaGrow gets its own Casdoor organization/tenant and application inside the
shared deployment. The organization is the ownership boundary for NalaGrow
users, provider configuration, roles, and permissions. It must not reuse the
Nala Labs platform organization for application users.

The NalaGrow application should be configured with:

- the shared Casdoor issuer;
- its own client/application registration;
- the Google provider and exact NalaGrow callback URI;
- `Parent` and `Admin` application roles;
- claims for subject, email/profile, organization/owner, roles, and
  permissions.

## Local identity mapping

Casdoor owns authentication credentials and external identity. NalaGrow still
owns application records and resource ownership. Every authenticated Casdoor
subject therefore needs a durable mapping to the existing NalaGrow user UUID.

Use the stable Casdoor subject plus organization/issuer as the mapping key.
Email is suitable only for an initial, conflict-checked match; it is not a
safe long-term identity key by itself. Existing baby, measurement, feeding,
sleep, and milestone rows remain attached to the NalaGrow user UUID.

## User migration

Existing NalaGrow users must be provisioned in the NalaGrow Casdoor
organization and linked to their existing local user rows. Do not delete local
rows or application data during the migration.

The existing bcrypt password hash may be preserved through the approved
Casdoor PostgreSQL import path; it must never be converted to or exposed as a
plaintext password. If that path is unavailable, use a password reset/invite
flow instead. Passwords, hashes, and temporary credentials stay in the
runtime migration workflow and never enter source, logs, tracker comments, or
PR descriptions.

Roles and permissions are authoritative in Casdoor. NalaGrow may cache or
project the claims locally for response compatibility, but it must not invent
product tiers or replace the Casdoor tenant boundary.
