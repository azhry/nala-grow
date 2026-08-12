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

Use schemas, not prose, in this table. Put the JSON request-body, path/query/header, response, error, and authorization schemas directly inside their dedicated table cells; do not add separate schema sections below the table. For GET or DELETE operations with no request body, put only `null` in the Request body schema cell. Never put path, query, or header metadata in that cell. Pretty-print every JSON schema with one property per line; do not use one-line JSON in table cells.

| Operation | Request body schema | Path/query/header schemas | Response/output schema | Errors and status schemas | Authorization/ownership schema |
| --- | --- | --- | --- | --- | --- |
| `[GraphQL operation or HTTP method/path]` | <pre><code class="language-json">[request body schema or null]</code></pre> | <pre><code class="language-json">[path/query/header schemas]</code></pre> | <pre><code class="language-json">[response schema]</code></pre> | <pre><code class="language-json">[error schemas]</code></pre> | <pre><code class="language-json">[authentication and ownership schema]</code></pre> |

### Internal behavior

- Validation and invariants: [What is enforced and where.]
- Transaction/atomicity behavior: [What must succeed or fail together.]
- Error handling and observability: [Stable errors, logging, and intentionally hidden details.]

## Security and isolation

- Authentication: [Covered scenarios.]
- Cross-user/resource ownership: [Covered scenarios.]
- Sensitive data: [How secrets, tokens, passwords, and internal errors are protected.]
- Abuse/boundary cases: [Malformed input, missing resources, limits, or "Not applicable".]

## Verification

### Manual request/response sequence

[Fixture: real configured fixture or exact command that creates it.]

#### Step 0 — Authenticate and export the session token

```sh
set -euo pipefail
export AUTH_BASE_URL="${AUTH_BASE_URL:-http://127.0.0.1:4000}"
export API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:4000}"
: "${NALA_TEST_USERNAME:?set from the configured test fixture}"
: "${NALA_TEST_PASSWORD:?set from the configured test fixture}"
export TOKEN="$(
  curl --silent --show-error \
    --header 'Content-Type: application/json' \
    --data "$(jq -n --arg username "$NALA_TEST_USERNAME" --arg password "$NALA_TEST_PASSWORD" '{username: $username, password: $password}')" \
    "$AUTH_BASE_URL/api/auth/login" | jq --exit-status --raw-output '.token'
)"
export DEPLOYMENT_ID="${DEPLOYMENT_ID:?set to the real persisted deployment fixture}"
```

Login response:

```json
{"authenticated":true,"token":"<redacted>","user":{"id":"<fixture-user-id>","tier":"<fixture-tier>"}}
```

#### Step 1 — [behavior under test]

Request:

```sh
curl \
  --header "Authorization: Bearer $TOKEN" \
  "$API_BASE_URL/<path>"
```

Response:

```json
[copy-paste response]
```

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
