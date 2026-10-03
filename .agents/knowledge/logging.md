# NalaGrow logging

## Log location

- Default: logs/nala-grow.log.
- NALA_LOG_FILE overrides the default path.
- Backend log paths are relative to the process working directory and are mirrored to stdout. Every HTTP request gets a server-generated `X-Request-ID` and a JSON trace with `request_id`, `method`, matched `route` template, `status`, `duration_ms`, and `response_bytes`. Error traces include safe `error_code` or `error_class`; panic traces include only the panic type.
- GraphQL events share the HTTP request ID and include operation type/name, `error_count`, and whether data was returned. Use the response's `X-Request-ID` to correlate both records. Logs omit query text, variables, response data, credentials, raw error values, panic values, and stack traces.


## Rotation

Logs rotate at 10 MiB, keep up to 5 compressed backups, and remove backups older than 30 days. Use a separate log file for each concurrently running backend process.

## Diagnosing failures

Inspect the current log and its rotated backups before drawing conclusions from a failure. Check the process working directory and NALA_LOG_FILE when the expected file is missing. Treat logs as diagnostic data and do not copy credentials, tokens, or private request data into new log messages.
