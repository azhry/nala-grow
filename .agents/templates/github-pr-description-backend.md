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

## Review and merge order

- Delivery shape: [Single focused PR | Stacked PR | Parallel PR group]
- This PR's review position: [Standalone | PR 1 of N | PR N of N | Parallel member A/B]
- Base branch: [main or predecessor branch]
- Depends on: [PR/commit and the exact delivered behavior, or "None"]
- Review order: [Exact order, or "Any order within <parallel group>"]
- Merge order and conditions: [Exact merge sequence and prerequisite checks, or "Any order; all required checks green"]
- Parallel group: [Group name and independent members, or "None"]
- Human-verification focus: [The one behavior and manual check a reviewer should prioritize]

## API and behavior contract

Repeat a row for every changed operation. Do not combine distinct operations when their inputs, authorization, or responses differ.

Use five independent contract cells plus the Operation column. Do not merge cells, move content between cells, or repeat the same contract in multiple cells. For GraphQL operations, put the request body operation document in a `gql` code block. For REST/JSON operations, put the request body schema in a `json` code block. Use JSON schemas, not prose, for non-body inputs, responses, errors, and authorization, and pretty-print every JSON object with one property per line.

1. **Request body** — for GraphQL, the operation document only in a `gql` code block; for REST/JSON, the JSON body schema only in a `json` code block. For GET or DELETE with no body, enter exactly `null` and nothing else. Never put path parameters, query parameters, headers, auth, or server-derived values here.
2. **Path/query/header schemas** — non-body request inputs only. Put `path`, `query`, and `headers` objects here. For a GET, this is where `appID`, `podName`, `Authorization`, and `Accept` belong.
3. **Response/output schema** — the success status, content type, event/frame shape, and returned fields.
4. **Errors and status schemas** — status-to-error JSON mappings only.
5. **Authorization/ownership schema** — authentication mechanism, identity claim, resource owner, and access rule only.

Markdown table safety is mandatory: keep every table row on one physical source line. Never put literal newlines or fenced code blocks inside a table cell. For readable multiline GraphQL inside a cell, use `<pre><code class="language-gql">` with `&#10;` between operation lines. For readable multiline JSON inside a cell, use `<pre><code class="language-json">` with `&#10;` between JSON lines; do not use one-line JSON, `<br>`, or literal newlines in the cell.

For a bodyless GET, the first two cells must look like this:

```text
Request body cell:          <pre><code class="language-json">null</code></pre>
Non-body input cell:        <pre><code class="language-json">{&#10;&nbsp;&nbsp;"path": {...},&#10;&nbsp;&nbsp;"query": {...},&#10;&nbsp;&nbsp;"headers": {...}&#10;}</code></pre>
```

For a POST or PATCH, the body cell contains only the GraphQL operation document or JSON body fields; path/query/header fields still go in the separate non-body-input cell. Do not add a separate schema section below the table.

| Operation | Request body (GraphQL `gql` document or JSON schema) | Path/query/header schemas (non-body inputs only) | Response/output schema | Errors and status schemas | Authorization/ownership schema |
| --- | --- | --- | --- | --- | --- |
| `[GraphQL operation or HTTP method/path]` | `[GraphQL: <pre><code class="language-gql">[operation document]</code></pre>; REST/JSON: <pre><code class="language-json">[request body schema]</code></pre>; bodyless: <pre><code class="language-json">null</code></pre>]` | <pre><code class="language-json">[path/query/header schemas]</code></pre> | <pre><code class="language-json">[response schema]</code></pre> | <pre><code class="language-json">[error schemas]</code></pre> | <pre><code class="language-json">[authentication and ownership schema]</code></pre> |

## Verification

### Manual request/response sequence

Write this as small, copy-pasteable Bash steps in the PR description. Do not
attach a script file or combine the verification into one bulk script. Use
real staging data and the documented staging fixture for the issue; do not use
placeholder values, fake records, or mocks. Never paste credentials, tokens,
or API keys into the PR.

Manual blocks run in the reviewer's interactive shell. Do not use `set -e`,
`set -u`, `set -o pipefail`, or `set -euo pipefail`; do not use `exit`, `exit 1`,
or cleanup traps that call `exit`. Use explicit `if`/`case` checks and print a
failure message so a failed check does not close the terminal. Keep each block
independently pasteable and leave the shell available for the next step.

#### Step 0 — Load the verified staging environment

```bash
set -a
. .agents/.env
set +a
: "${STAGING_AUTH_BASE_URL:?Set this to the verified staging auth URL}"
: "${STAGING_API_BASE_URL:?Set this to the verified staging API URL}"
export AUTH_BASE_URL="$STAGING_AUTH_BASE_URL"
export API_BASE_URL="$STAGING_API_BASE_URL"
printf 'staging auth: %s\nstaging API: %s\n' "$AUTH_BASE_URL" "$API_BASE_URL"
```

Expected response:

```text
staging auth: https://<verified-staging-auth-host>
staging API: https://<verified-staging-api-host>
```

The command must exit 0 and identify the real staging targets without printing
secret values. Replace the example hosts with the actual targets before
handoff; do not leave placeholders in the completed PR.

#### Step 1 — Authenticate with the real staging fixture

```bash
: "${NALA_TEST_USERNAME:?Load the documented staging fixture from .agents/.env}"
: "${NALA_TEST_PASSWORD:?Load the documented staging fixture from .agents/.env}"
login_response="$(curl --fail-with-body --silent --show-error \
  --request POST \
  --header 'Content-Type: application/json' \
  --data "$(jq -n --arg username "$NALA_TEST_USERNAME" --arg password "$NALA_TEST_PASSWORD" \
    '{username: $username, password: $password}')" \
  "$AUTH_BASE_URL/api/auth/login")"
printf '%s\n' "$login_response" | jq 'del(.token)'
export TOKEN="$(printf '%s' "$login_response" | jq -er '.token')"
```

Expected response:

```json
{"authenticated":true,"user":{"id":"<verified-fixture-user-id>","tier":"<verified-fixture-tier>"}}
```

The command must exit 0, identify the real fixture account, and export `TOKEN`
only in the current shell.

#### Step 2 — Select the real persisted fixture

```bash
: "${STAGING_DEPLOYMENT_ID:?Set this to the documented persisted staging deployment}"
export DEPLOYMENT_ID="$STAGING_DEPLOYMENT_ID"
printf 'deployment fixture: %s\n' "$DEPLOYMENT_ID"
```

Expected response:

```text
deployment fixture: <verified-staging-deployment-id>
```

Replace the example value with the real observed fixture before handoff.

#### Step 3 — [real behavior under test]

Command:

```bash
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $TOKEN" \
  "$API_BASE_URL/<documented-staging-path>"
```

Expected response:

```json
{"<field>":"<verified-staging-value>"}
```

Replace the path and response with the real staging operation and observed
contract. Add one numbered step per meaningful action; each step must include
its own Bash command and expected response.

#### Step 4 — [required regression, error, or ownership check]

Command:

```bash
[one Bash command for the real staging boundary case]
```

Expected response:

```text
[exact status, response field, or assertion observed in staging]
```

Record each command's exact exit status and distinguish staging or pre-existing
failures from regressions introduced by the PR.

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
