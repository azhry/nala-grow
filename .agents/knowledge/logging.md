# NalaGrow logging

## Log location

- Default: logs/nala-grow.log.
- NALA_LOG_FILE overrides the default path.
- Backend log paths are relative to the process working directory and are mirrored to stdout. Request records include method, path, status, and duration; GraphQL fields are sanitized before logging.


## Rotation

Logs rotate at 10 MiB, keep up to 5 compressed backups, and remove backups older than 30 days. Use a separate log file for each concurrently running backend process.

## Diagnosing failures

Inspect the current log and its rotated backups before drawing conclusions from a failure. Check the process working directory and NALA_LOG_FILE when the expected file is missing. Treat logs as diagnostic data and do not copy credentials, tokens, or private request data into new log messages.
