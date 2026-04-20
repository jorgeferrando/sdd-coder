# Tasks: Bootstrap Fastify Server with Health Endpoint

## Metadata
- **Change:** bootstrap-fastify-server
- **Ticket:** N/A
- **Branch:** bootstrap-fastify-server
- **Date:** 2026-04-20

## Implementation Tasks

- [x] **T01** Create `src/server.ts` — minimal Fastify 5 instance with `logger: true`, `GET /health` returning `{ status: 'ok' }`, top-level `await app.listen({ host: '0.0.0.0', port: 3000 })`, and a `.catch` that logs and exits non-zero on listen failure.
  - Commit: `[bootstrap-fastify-server] Add Fastify server with /health endpoint`
  - Depends on: none
  - Validates: all acceptance criteria in `proposal.md`

## Quality Gate

- [x] **QG** Manual validation (automated lint/format runs automatically via pre-commit hook on T01)
  - `npm run check` — Biome lint + format (also runs via pre-commit hook; must pass before commit)
  - `npm run build` — verify `tsc --strict` compiles `src/server.ts` with no errors
  - `docker compose up` — `app` and `db` containers both reach healthy / running state
  - `curl -s http://localhost:3000/health` — expect HTTP `200` and body `{"status":"ok"}`
  - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/does-not-exist` — expect `404` with JSON body (Fastify default shape), not HTML and not a stack trace
  - Confirm startup log line shows `Server listening at http://0.0.0.0:3000` (from Fastify's pino logger)

## Notes

- **Single-file change.** No interleaving, no inter-task dependencies. If T01 grows beyond one file during implementation, stop and escalate — the design forbids it.
- **No unit or integration tests in this change** (by design; see proposal "Scope → Out of scope" and spec "Decisions Made"). The Quality Gate is entirely manual + toolchain.
- **Pre-commit hook enforces Biome.** `npm run check` runs on the staged file automatically; a T01 commit cannot land with lint/format errors.
- **Branch already created** (`bootstrap-fastify-server`). Commit directly on this branch; merge to `master` is gated by `/sdd-verify` and explicit user approval per project git workflow.
- **Unrelated untracked files** present at branch creation (`.claude/settings.local.json`, `skills-lock.json`, residual archive/spec dirs from previous changes). **MUST NOT** be staged in T01 — use explicit `git add src/server.ts` only.
