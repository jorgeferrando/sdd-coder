# Proposal: Bootstrap Fastify Server with Health Endpoint

## Metadata
- **Change:** bootstrap-fastify-server
- **Ticket:** N/A
- **Date:** 2026-04-20

## Context

The previous change `project-setup` wired Docker Compose, Postgres, the TypeScript toolchain, and declared Fastify 5 as a dependency — but no runtime code exists. `package.json` points `npm run dev` at `src/server.ts`, and the `Dockerfile` `CMD` runs `npx tsx src/server.ts`, yet that file does not exist. Running `docker compose up` today starts Postgres successfully and then the `app` container crashes because there is no entrypoint to execute. This change creates the first piece of runtime code, unblocking every subsequent feature in the IT-0 MVP pipeline.

## Problem

There is no HTTP server. The `app` container cannot answer any request, so:

- The canonical spec `openspec/specs/infrastructure/spec.md` — which promises "when a request is made to `http://localhost:3000`, the app container responds" — is not actually satisfied.
- No downstream change (routes, SSE, UI static serving, pipeline HTTP entrypoints) can be developed or tested, because it has no host process to attach to.
- There is no way for Docker, a future reverse proxy, or a developer to tell whether the process is alive.

## Scope

**In scope:**
- Create `src/server.ts` with a minimal Fastify 5 instance.
- Register a single route: `GET /health` returning `200` with body `{"status":"ok"}`.
- Bind to `0.0.0.0:3000` so the container is reachable from the host (Docker gotcha).
- Rely on Fastify's default error and not-found handlers — they already return structured JSON (no stack traces), satisfying `conventions.md` without custom code.
- Start the server when the module is executed and log a single startup line.

**Out of scope:**
- Clean-architecture layout from `structure.md` (`src/infrastructure/http/...`, ports, adapters) — introduced in a later change when there is real code to place there.
- Database connection, `pg` pool, readiness probes, or any `/health` dependency checks.
- Graceful shutdown beyond Fastify's built-in behavior.
- Any non-`/health` route, SSE, static UI serving, request logging, or middleware.
- Unit or integration tests for the server — the acceptance criteria are satisfied by running the container and hitting the endpoint; formal tests are introduced when there is logic worth covering.

## Proposed Solution

A single file, `src/server.ts`, that:

1. Imports `fastify` from `fastify`.
2. Creates an instance with default options plus a lightweight logger (`logger: true`).
3. Registers `app.get('/health', ...)` returning `{ status: 'ok' }`.
4. Calls `app.listen({ port: 3000, host: '0.0.0.0' })` and exits non-zero on listen failure.
5. Error and not-found handling is left to Fastify's defaults (structured JSON, no stack traces).

ESM, strict TypeScript, no `any`. Runs under `tsx` in dev, compiled by `tsc` in the prod Docker stage — both already configured.

## Alternatives Discarded

| Alternative | Reason discarded |
|-------------|-----------------|
| Start with full clean-arch layout (`src/infrastructure/http/server.ts`, ports, composition root) | YAGNI. Structure is meaningful only when there is code to organize. Introducing it now would create empty directories and indirection with no value. Deferred to the change that adds the first real adapter. |
| Include a `pg` ping inside `/health` (readiness probe) | Pulls DB wiring into a change whose stated purpose is the server. Readiness belongs with the DB connection change. A liveness-only `/health` is the orthodox split. |
| Use Node's built-in `http` module instead of Fastify | Fastify is already a declared dependency and a stack decision in `tech.md`. Using raw `http` now would mean rewriting on the next change. |
| Write a custom `setErrorHandler` now | Fastify's default handlers already return structured JSON (no stack traces), which satisfies the `conventions.md` **MUST**. A custom shape has no consumer yet (no UI, no SSE) — introduce it when a client actually depends on a specific error shape. |
| Add `/health` response schema via `@sinclair/typebox` or Fastify schema | Premature. The response shape is trivial and the schema machinery will be introduced when the first non-trivial route exists. |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Fastify binds to `localhost` inside the container, making it unreachable from the host | High if forgotten | High | Explicitly pass `host: '0.0.0.0'` to `app.listen`; document why inline. |
| Strict TS + Biome `noExplicitAny` friction on Fastify's typed plugins | Medium | Low | The minimal server uses only core Fastify APIs which are fully typed. No `any` needed. |
| Fastify default error handler leaks too much or too little information | Low | Low | Fastify defaults log via `logger: true` and respond with a stable JSON shape. Re-evaluate when the first consumer (UI or API client) pins an expected shape. |
| The `project-setup` infrastructure spec ("any HTTP response") becomes outdated | Medium | Low | This change introduces a new `http` domain spec with the real `GET /health` contract. The infrastructure spec stays focused on container/DB concerns. |

## Impact

- **Files affected:** 1 created (`src/server.ts`). No modifications to existing files.
- **Domains:** introduces a new canonical domain `http` (separates runtime HTTP surface from `infrastructure`, which stays Docker/DB-focused).
- **Tests:** none in this change. Manual verification: `docker compose up` → `curl http://localhost:3000/health` → `200 {"status":"ok"}`.

## Dependencies

- **Depends on:** `project-setup` (archived) — `package.json`, `tsconfig.json`, `Dockerfile`, `docker-compose.yml`, Fastify 5 dependency.
- **Blocks:** every subsequent change that needs HTTP routes (threads REST, SSE, static UI serving, pipeline endpoints).

## Acceptance Criteria

- [ ] `src/server.ts` exists and type-checks under `tsc --noEmit` with `strict: true`.
- [ ] `npm run dev` starts the server without type errors and logs a line indicating it is listening on `0.0.0.0:3000`.
- [ ] `npm run check` (Biome lint + format) passes on `src/server.ts`.
- [ ] `docker compose up` brings `app` + `db` up and `app` stays running (no crash loop).
- [ ] `curl -s http://localhost:3000/health` returns HTTP `200` with body `{"status":"ok"}`.
- [ ] `curl -s http://localhost:3000/does-not-exist` returns a structured JSON error (Fastify's default 404 shape: `{statusCode, error, message}`), not a stack trace.
- [ ] Nothing outside `src/server.ts` is created or modified.
