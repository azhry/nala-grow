# Backend PR description template

Use this template for Go service, GraphQL/API, authentication, persistence, or migration work. Replace every bracketed placeholder. Remove a conditional section only when it genuinely does not apply.

The PR description is the review and handoff record. Do not claim a check passed unless the exact command exited 0. Put blockers and pre-existing failures in their own section rather than presenting partial execution as success.

## Linked work

- Linear issue: [AZH-000 and URL]
- Parent/source issue: [issue ID and URL, or "None"]
- Depends on: [issue/PR and delivered artifact, or "None"]
- Unblocks: [issue IDs, or "None"]

## Summary

- [Observable backend outcome.]
- [API, security, persistence, or migration outcome.]
- [Important compatibility outcome.]

## Scope

### Included

- [Implemented behavior and affected package/path.]
- [Additional in-scope behavior.]

### Excluded

- [Nearby work intentionally not changed.]

## API and behavior contract

Repeat a row for every changed operation. Do not combine distinct operations when their inputs, authorization, or responses differ.

| Operation | Request/input change | Response/output change | Errors and status | Authorization/ownership |
| --- | --- | --- | --- | --- |
| `[GraphQL operation or HTTP method/path]` | [Fields, types, required/optional/default behavior] | [Fields, types, nullability] | [Client-visible failures] | [Authentication and resource isolation] |

### Internal behavior

- Validation and invariants: [What is enforced and where.]
- Transaction/atomicity behavior: [What must succeed or fail together.]
- Error handling and observability: [Stable errors, logging, and intentionally hidden details.]

## Persistence and migrations

- Storage seam: [Repository/query/service path, or "No persistence change"]
- Migration files: [up/down paths, or "None"]
- Schema changes: [Tables, columns, constraints, indexes, and defaults]
- Existing-data behavior: [Backfill, fallback, nullable/default handling, or "Not applicable"]
- Rollback behavior: [What the down migration does and any irreversible limitation]
- Durability evidence: [Create/write → new request/client/process boundary → read/reload result]

## Security and isolation

- Authentication: [Covered scenarios.]
- Cross-user/resource ownership: [Covered scenarios.]
- Sensitive data: [How secrets, tokens, passwords, and internal errors are protected.]
- Abuse/boundary cases: [Malformed input, missing resources, limits, or "Not applicable".]

## Verification

Record commands exactly as executed and their real exit statuses.

| Command or scenario | Exit/result | Evidence or assertions |
| --- | ---: | --- |
| `go build ./...` | [0/nonzero/not run] | [Result or reason not run] |
| `go test ./... -count=1 -short -v` | [0/nonzero/not run] | [Packages/assertions] |
| `make test-integration` | [0/nonzero/not applicable] | [Real PostgreSQL/API round trips and isolation] |
| `make test-coverage` | [0/nonzero/not run] | [Total/relevant coverage] |
| [Additional focused command] | [Result] | [Assertions] |

### Database integration lifecycle

- Fresh database/container: [Image/version and confirmation of empty initial product data]
- Migrations: [Applied migrations and result]
- Fixtures: [Deterministic seed source and what it creates]
- API round trip: [Operations exercised against persisted data]
- Cleanup: [Evidence that pools and containers were removed, including failure paths]

## Compatibility and rollout

- Backward compatibility: [Existing clients/records and behavior.]
- Deployment order: [Backend/frontend/migration sequencing, or "No special order"]
- Configuration/environment changes: [Names only; never include secret values.]
- Operational risk and rollback: [Risk, monitoring, rollback plan.]

## Known limitations and pre-existing failures

- [Exact command, exit status, affected path, and why it is unrelated; or "None known".]

## Reviewer focus

- [Highest-risk contract, migration, authorization, or concurrency decision.]
- [Specific file or behavior that merits close review.]

## Completion self-audit

- [ ] Every issue requirement is mapped to an implemented outcome or explicit blocker.
- [ ] Every changed operation lists its inputs, outputs, errors, and authorization behavior.
- [ ] Persistence claims cross a new request/client/process boundary rather than reuse an in-memory object.
- [ ] Migration up/down and existing-data behavior are documented and tested where applicable.
- [ ] Success, validation, unauthenticated, cross-user, absent-resource, and persistence-error paths are covered where applicable.
- [ ] Exact unfiltered commands and exit statuses are recorded.
- [ ] Generated coverage, logs, dumps, credentials, and unrelated files are absent from the diff.
- [ ] The linked Linear issue and dependencies reflect the actual handoff state.
