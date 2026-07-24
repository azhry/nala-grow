# GitHub CLI rules

- Verify `gh` is the official standalone CLI, not an npm-installed wrapper. Use `Get-Command gh | Format-Table Source` to inspect.
- If the resolved executable is an npm wrapper (`node_modules/gh/...`), remove the npm package and install the official release via `winget install GitHub.cli`.
- After installing or repairing `gh`, run `gh auth status` and confirm token presence. If authentication is missing, configure it non-interactively only when a valid stored credential is not already present.
- GitHub delivery should use the authenticated `gh` CLI. If `gh` is unavailable or fails, record the blocker in Linear with the exact failing command and affected path.
