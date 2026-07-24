# Shell, tooling, and quoting rules

- PowerShell is the default shell on this workstation. For commands that contain JSON, GraphQL, quotes, or newlines, prefer a Node.js script file in the temp directory (`C:\Users\Lyrid\AppData\Local\Temp\kilo`) over inline one-liners.
- When invoking commands from PowerShell that contain strings with quotes or newlines, either:
  - write the payload to a temp file and pass it with `-InFile`, or
  - use `node -e` / a temp `.js` script.
- Do not embed raw JSON or GraphQL directly in PowerShell string arguments.
