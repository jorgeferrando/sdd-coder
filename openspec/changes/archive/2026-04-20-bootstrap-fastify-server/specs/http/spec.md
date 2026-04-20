# Spec: http — Bootstrap Fastify Server with Health Endpoint

## Metadata
- **Domain:** http
- **Change:** bootstrap-fastify-server
- **Date:** 2026-04-20
- **Status:** approved

## Expected Behavior

### Main Case

**Given** the `app` process is running,
**When** a client sends `GET http://{host}:3000/health`,
**Then** the server responds with HTTP `200`, `Content-Type: application/json`, and body `{"status":"ok"}`.

### Alternative Cases

| Scenario | Condition | Result |
|----------|-----------|--------|
| Any request to an unknown path | e.g. `GET /does-not-exist`, `POST /foo` | HTTP `404` with Fastify's default JSON body `{"statusCode":404,"error":"Not Found","message":"..."}` |
| Non-`GET` method on `/health` | e.g. `POST /health`, `DELETE /health` | HTTP `404` with the same default not-found JSON (no dedicated method-not-allowed path is registered) |
| Server startup succeeds | `npm run dev` or container boot | Process logs a single line indicating it is listening on `0.0.0.0:3000`; process stays alive |
| Port 3000 already in use | Another process holds the port | `app.listen` rejects; the process logs the error and exits with non-zero code |

### Errors

| Error | When | Response |
|-------|------|----------|
| Unhandled exception inside a route handler | A future route throws or rejects | HTTP `500` with Fastify's default JSON body; no stack trace in the response body; error logged via Fastify's built-in logger |
| Malformed JSON in request body | (N/A in this change — no routes accept a body) | — |

## Business Rules

- **BR-01:** The server **MUST** bind to host `0.0.0.0`. Binding to the default `localhost` makes the container unreachable from the Docker host and breaks the acceptance criteria.
- **BR-02:** The server **MUST** listen on port `3000` inside the container (the host-side mapping is configurable via `${PORT:-3000}` in `docker-compose.yml`, but the internal port is fixed).
- **BR-03:** Error responses (`4xx`, `5xx`) **MUST** be JSON and **MUST NOT** contain stack traces. Fastify's default `errorHandler` and `notFoundHandler` satisfy this without custom code.
- **BR-04:** The `GET /health` endpoint is a **liveness** probe only — it performs no dependency checks (no DB query, no filesystem access, no network call). It answers the single question "is this process alive?".
- **BR-05:** Structured logging **MUST** be enabled (Fastify's `logger: true`) so that request and error events are captured at stdout for Docker.

## Decisions Made

| Decision | Alternative discarded | Reason |
|----------|-----------------------|--------|
| New canonical domain `http` | Extend `infrastructure` | Keeps `infrastructure` focused on Docker/DB. HTTP surface (endpoints, response shapes, error contracts) is a distinct behavior domain that will grow with every route added (threads, SSE, static UI). |
| Rely on Fastify's default error and not-found handlers | Ship a custom `setErrorHandler` / `setNotFoundHandler` | Defaults already return structured JSON (no stack traces), satisfying `conventions.md`. No consumer depends on a specific error shape yet. YAGNI. |
| `GET /health` body is exactly `{"status":"ok"}` | Add `uptime`, `version`, DB ping | Liveness-only. Readiness and version endpoints are introduced when something needs them (orchestrator, dashboard). |
| Bind `host: '0.0.0.0'` explicitly | Rely on Fastify defaults | Fastify defaults to `localhost`, which is invisible from outside Docker. This MUST be set for the container to be reachable. |
| Single `src/server.ts` (no clean-arch layout yet) | Adopt `src/infrastructure/http/` structure from day 1 | No second adapter or route exists yet to justify the indirection. The structure is introduced when real code fills it. |
| No tests in this change | Write `app.inject()` smoke test | The only non-framework behavior is the `/health` body literal. Testing it would test Fastify. Test infrastructure is introduced alongside the first route with real logic. |

## Open / Pending

- None. All behavior is decided.

## Relationship to Other Domains

- **Extends** nothing canonical yet — creates the `http` domain.
- **Touches** `infrastructure`: the existing spec line "*when a request is made to `http://localhost:3000`, the app container responds*" is made more precise here, but the `infrastructure` spec is not modified by this change. It remains accurate (the container still responds; the concrete `/health` contract now lives in the `http` spec).
- **Downstream impact**: future changes that add routes (threads API, SSE stream, static UI serving) extend this `http` spec with new endpoints, response shapes, and error contracts.
