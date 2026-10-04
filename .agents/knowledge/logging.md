# NalaGrow logging

## Log location

- Default: logs/nala-grow.log.
- NALA_LOG_FILE overrides the default path.
- Backend log paths are relative to the process working directory and are mirrored to stdout. Every HTTP request gets a server-generated `X-Request-ID` and a JSON trace with `request_id`, `method`, matched `route` template, concrete `request_path`, sanitized `query`, request/response headers, bounded request/response body summaries, `status`, `duration_ms`, and `response_bytes`. Error traces include safe `error_code` or `error_class`; panic traces include a sanitized panic value and stack locations.
- HTTP handler failures emit a separate `endpoint_error` event with the same request ID, method, route template, status, safe error code/class, and failure stage. GraphQL resolver failures add the root field name; GraphQL operation errors also record operation type/name, error count, and execution stage. GraphQL may return HTTP 200 for operation errors.
- GraphQL events share the HTTP request ID and include operation type/name, `error_count`, and whether data was returned. Use the response's `X-Request-ID` to correlate both records. HTTP body summaries redact GraphQL query text and variables, plus credential-like fields, while retaining sanitized GraphQL error messages and locations. Body capture is limited to 4 KiB; JSON summaries include at most 32 object fields, 10 array items, and four nested levels, with individual strings limited to 256 characters. Truncated bodies report their byte count without a partial body. Authorization, cookies, passwords, tokens, API keys, OAuth state/code, Vault `value` fields, and connection-string credentials are redacted. Panic records include the sanitized panic value and up to 24 stack frames.


## Rotation

Logs rotate at 10 MiB, keep up to 5 compressed backups, and remove backups older than 30 days. Use a separate log file for each concurrently running backend process.

## Diagnosing failures

Inspect the current log and its rotated backups before drawing conclusions from a failure. Check the process working directory and NALA_LOG_FILE when the expected file is missing. Treat logs as diagnostic data and do not copy credentials, tokens, or private request data into new log messages.
