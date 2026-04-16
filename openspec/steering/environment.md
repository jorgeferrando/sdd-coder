# Environment: SDD Coder

## Runtimes

- Node.js: v24.11.1
- TypeScript: to be installed (target 5.x)

## CLI tools

- git: 2.51.2 (Windows)
- gh: 2.83.1
- docker: 29.3.1
- npm: bundled with Node.js 24

## Available MCPs

- context7: not confirmed (not detected in scan)
- github: gh CLI available (use for PR operations)
- jira/linear: not applicable for MVP

## Docker

- Docker Desktop available
- Docker Compose V2 (`docker compose` command)
- Two services planned: `app` (Node.js) + `db` (PostgreSQL 16)

## Notes

- Development on Windows 11 with Git Bash / bash shell
- All file paths in code should use forward slashes or `path.join()` — never hardcoded backslashes
- Container paths use Linux conventions (`/repo`, `/skills`)
- Git credentials from host must be passed into the Docker container for `gh` operations
