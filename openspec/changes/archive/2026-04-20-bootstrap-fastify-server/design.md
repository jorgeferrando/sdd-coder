# Design: Bootstrap Fastify Server with Health Endpoint

## Metadata
- **Change:** bootstrap-fastify-server
- **Date:** 2026-04-20
- **Status:** approved

## Technical Summary

A single file `src/server.ts` acts as the composition root. It instantiates a Fastify 5 app with `logger: true`, registers exactly one route (`GET /health`), and calls `app.listen({ host: '0.0.0.0', port: 3000 })` at module top-level. No abstractions, no layers, no DI — because there is nothing to compose yet. The clean-architecture layout in `structure.md` is a target, not a day-1 requirement; introducing `infrastructure/http/`, `ports/`, and `application/` directories now would create empty folders and meaningless indirection.

The bootstrap relies entirely on Fastify 5 defaults for error and 404 handling (both already return structured JSON that satisfies `conventions.md` error-handling rules). Runtime executes under `tsx` in dev and as plain compiled `node dist/server.js` in the prod Docker stage — both paths are already wired.

## Architecture

```
Docker host             app container (Node 24)
──────────              ──────────────────────
curl :${PORT:-3000}  ─► :3000 ─► Fastify (logger: true)
                                   │
                                   ├─ GET  /health      ──► { status: 'ok' }   (200 JSON)
                                   └─ *   (anything)    ──► Fastify default 404 JSON
                                                             or default 500 JSON on throw
```

Port mapping: `docker-compose.yml` maps `${PORT:-3000}:3000`. Host port is configurable via `.env`; internal container port is fixed at `3000` (BR-02).

## Files to Create

| File | Type | Purpose |
|------|------|---------|
| `src/server.ts` | TypeScript ESM module, composition root | Create Fastify instance with logger, register `GET /health`, call `listen({ host: '0.0.0.0', port: 3000 })`, exit non-zero on listen failure |

Structural contents (no code block):

1. `import Fastify from 'fastify'` (default export; see Design Decisions).
2. Call `Fastify({ logger: true })` and bind to a `const app`.
3. Register `app.get('/health', () => ({ status: 'ok' }))` — sync handler, returns a plain object literal (Fastify serialises to JSON with `Content-Type: application/json`).
4. Call `await app.listen({ host: '0.0.0.0', port: 3000 })` at module top level (top-level `await` is allowed under `"module": "NodeNext"` for an ESM entrypoint).
5. Wrap the `listen` call's failure path with a minimal `.catch` (or surrounding `try`) that logs via `app.log.error(err)` and calls `process.exit(1)`. Fastify also auto-logs `listen` failures via its own logger, so the role of this catch is exit-code propagation, not logging.

## Files to Modify

None. No changes to `package.json`, `tsconfig.json`, `Dockerfile`, `docker-compose.yml`, `biome.json`, or any steering file. The proposal's acceptance criterion "Nothing outside `src/server.ts` is created or modified" is a hard constraint of this design.

## Scope

- **Total files:** 1 created, 0 modified.
- **Result:** Ideal (< 10).

## Design Decisions

| Decision | Alternative | Reason |
|---------|------------|--------|
| Top-level `await app.listen(...)` followed by a `.catch(err => { app.log.error(err); process.exit(1); })` chained onto the returned promise | `async function main() { ... } main().catch(...)` wrapper | ESM + `NodeNext` supports top-level await natively. The wrapper adds a function, a call site, and no testability gain (the file has no exports either way). Chaining `.catch` on the listen promise keeps the file as flat as the spec. |
| `src/server.ts` auto-starts on import (side-effectful module) | Export a `start()` function and call it from a separate entrypoint | There is no second entrypoint (no tests, no CLI, no alt runner) and both `package.json` and `Dockerfile` invoke this file directly as the process entry. An exported `start()` would be dead abstraction. When tests arrive, the split will be motivated by `app.inject()` usage and introduced then. |
| `import Fastify from 'fastify'` (default import) | `import { fastify }` named import | Fastify 5 docs lead with the default export; `esModuleInterop: true` is set in `tsconfig.json`; every Fastify 5 example uses this form. Named `fastify` works too but is the road-less-travelled. |
| Let `FastifyInstance` type be inferred from `Fastify({ ... })` | Explicit `const app: FastifyInstance = Fastify(...)` | Inference is exact (including logger-enabled type variant) and no other module consumes the type. Adding the annotation adds an import for zero benefit. |
| `GET /health` handler is a synchronous arrow returning an object literal | `async () => ({ status: 'ok' })` | No I/O, no awaits — `async` would add a microtask and an unused promise allocation per request. Fastify handles both forms; sync is the minimal correct shape. |
| Listen options as a single object `{ host, port }` | Positional `app.listen(3000, '0.0.0.0')` | The positional form is deprecated in Fastify 4+ and removed from the Fastify 5 type signatures. Object form is the only supported API. |
| No custom `setErrorHandler` / `setNotFoundHandler` | Register custom handlers | Confirmed in the spec: Fastify 5 defaults already emit structured JSON with no stack traces. Adding handlers now = writing code with no consumer. |
| Health body literal `{ status: 'ok' }` returned directly | Wrap in `reply.send(...)` or set `reply.type('application/json')` explicitly | Returning a plain object from a Fastify handler auto-serialises to JSON and sets `Content-Type: application/json`. Explicit `reply.send` is equivalent but noisier. |

## Implementation Notes

### Conventions compliance

- **ESM only.** `src/server.ts` uses `import` syntax exclusively. No `require()`, no `module.exports`. (`conventions-nodejs.md` — Module design.)
- **No sync I/O.** The file performs no `fs` calls, no `execSync`. The only startup side effect is `app.listen`, which is async. (`conventions-nodejs.md` — Event loop.)
- **No `any`.** Fastify 5 ships full TypeScript types; the inferred types for `Fastify({ logger: true })` and the handler signature cover every surface this file touches. Biome's `suspicious/noExplicitAny: "error"` will pass trivially.
- **`const` over `let`.** `app` is `const`. There is no mutable module-scope state.
- **Error boundary (conventions.md — Error handling).** Satisfied by Fastify defaults for routes; `conventions.md` says "Use Fastify's global error handler" — the global default error handler *is* Fastify's global error handler until replaced. No unhandled promise rejection path exists in this file beyond the `listen` failure, which is caught and exits.

### Biome / lint

- No explicit return type on the handler is needed; Biome does not require return-type annotations. The return type is inferred as `{ status: string }` which Fastify serialises as JSON.
- Trailing newline, double quotes, tab/space — whatever `biome.json` currently dictates. `npm run check` (pre-commit hook) will normalise on commit.

### TypeScript / tsconfig

- `tsconfig.json` is **not** modified. Relevant settings already in place:
  - `"module": "NodeNext"` + `"moduleResolution": "NodeNext"` — native ESM with `.js` import specifiers required when importing local files (not relevant here; only `fastify` is imported).
  - `"target": "ES2022"` — supports top-level await at the emitted JS level.
  - `"strict": true` — enforces strict null checks, no implicit any.
  - `"esModuleInterop": true` — makes `import Fastify from 'fastify'` resolve cleanly.
  - `"rootDir": "src"`, `"outDir": "dist"` — `tsc` emits `dist/server.js`, which is what `Dockerfile` prod stage invokes.

### Docker interaction

- Dev stage runs `npx tsx src/server.ts`. `tsx` executes the module directly; top-level `await` runs at import, `app.listen` binds `0.0.0.0:3000`, the container port is published to the host via the compose `ports` mapping.
- Prod stage runs `npm run build` (which is `tsc`) and then `node dist/server.js`. `tsc` does **not** execute the module — it only emits JS — so having a side-effectful top-level `await` does not cause build-time network binding. Binding happens only when `node dist/server.js` actually runs.
- No environment variable is read by this file. Port `3000` is a constant by spec (BR-02). If a future change introduces `PORT` env overrides inside the container, it will amend this file and the spec together.

### Manual validation (post-implementation)

Per the proposal's Acceptance Criteria: `docker compose up` → container stays alive → `curl -s http://localhost:3000/health` → `200 {"status":"ok"}` → `curl -s http://localhost:3000/does-not-exist` → Fastify default 404 JSON. No automated tests in this change.

### What this file deliberately does NOT do

- No graceful shutdown (`SIGTERM` / `SIGINT` → `app.close()`). Deferred — Docker sends `SIGTERM` on `compose down` and Fastify's default is acceptable for IT-0. Will be addressed alongside the first stateful dependency (DB pool) that needs draining.
- No request-body parsing config, no schema registration, no plugins, no CORS. None are needed for a single sync-JSON health route.
- No reading of `process.env` for port or host. The spec pins both values.
