# Shell, tooling, and quoting rules

- PowerShell is the default shell on this workstation. For commands that contain JSON, GraphQL, quotes, or newlines, prefer a Node.js script file in the temp directory (`C:\Users\Lyrid\AppData\Local\Temp\kilo`) over inline one-liners.
- For GraphQL containing `$` variables, always use a temporary `.js` file; do not use inline PowerShell or `node -e`.
- Do not embed raw JSON or GraphQL directly in PowerShell string arguments.
