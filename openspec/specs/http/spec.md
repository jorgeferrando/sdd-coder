# Spec: HTTP

Status: canonical
Domain: http
Change: bootstrap-fastify-server

## Expected Behavior

### Liveness endpoint

- Given the `app` process is running,
  When a client sends `GET http://{host}:3000/health`,
  Then the server responds with HTTP `200`, `Content-Type: application/json; charset=utf-8`, and body `{"status":"ok"}`.

### Unknown path or method

- Given the server is running,
  When a client sends any request whose method + path combination has no registered route (including `POST /health`, `DELETE /health`, `GET /does-not-exist`, etc.),
  Then the server responds with HTTP `404` and Fastify's default not-found JSON body `{"statusCode":404,"error":"Not Found","message":"..."}`. No custom `setNotFoundHandler` is registered.

### Unhandled exception in a route

- Given a future route handler throws or rejects,
  When the exception propagates,
  Then the server responds with HTTP `500` and Fastify's default error JSON body. No stack trace leaks to the response. The error is logged via Fastify's built-in pino logger.

### Startup

- Given the process is launched via `npm run dev`, `npx tsx src/server.ts`, or `node dist/server.js`,
  When `app.listen({ host: '0.0.0.0', port: 3000 })` resolves,
  Then the server is reachable on all network interfaces of the host (pino logs one line per bound interface, e.g. `127.0.0.1:3000` and the LAN IP).

- Given port `3000` is already in use,
  When `app.listen(...)` rejects,
  Then the error is logged via `app.log.error(err)` and the process exits with non-zero status.

### Structured logging

- Given `logger: true` is set on the Fastify instance,
  When any request is served,
  Then pino emits structured JSON log lines for `incoming request` and `request completed`, each with `reqId`, HTTP method, URL, status code, and `responseTime`.

## Business Rules

- **BR-01:** The server **MUST** bind to host `0.0.0.0`. Binding to the default `localhost` makes the container unreachable from the Docker host and breaks downstream integration.
- **BR-02:** The server **MUST** listen on port `3000` inside the container. The host-side port is configurable via `${PORT:-3000}` in `docker-compose.yml`, but the internal port is fixed.
- **BR-03:** Error responses (`4xx`, `5xx`) **MUST** be JSON and **MUST NOT** contain stack traces. Fastify's default `errorHandler` and `notFoundHandler` satisfy this; a custom handler is not introduced until a consumer requires a specific shape.
- **BR-04:** The `GET /health` endpoint is a **liveness** probe only. It **MUST NOT** query the database, touch the filesystem, or call any network service. It answers the single question "is this process alive?".
- **BR-05:** Structured logging **MUST** be enabled (Fastify's `logger: true`) so that request and error events reach stdout for Docker and downstream log collectors.

## Edge Cases

- Repeated `/health` polling (liveness/readiness probes hitting the endpoint every few seconds) is expected and has no side effects — the handler allocates a fresh literal each call.
- `HEAD /health` returns `404`, not `200`. Fastify 5 does not auto-register `HEAD` for `GET` routes. If an external health checker requires `HEAD`, it will need an explicit registration in a future change.

## Decisions Made

- **Minimal composition root.** A single file `src/server.ts` holds the Fastify instance, the route, and the listen call. The clean-architecture layout in `openspec/steering/structure.md` (`src/infrastructure/http/`, `ports/`, `application/`) is a target, introduced when a second adapter or route justifies the indirection.
- **Rely on Fastify defaults for errors and not-found.** Fastify 5's default handlers already return structured JSON without stack traces, satisfying BR-03 without any custom code.
- **`/health` body is exactly `{"status":"ok"}`.** No uptime, no version, no DB ping. Readiness and version endpoints will be introduced when something concrete (orchestrator, dashboard) depends on them.
- **Explicit `host: '0.0.0.0'`.** Fastify defaults to `localhost`, which is invisible outside Docker. This is a hard bind requirement, not a configuration.
- **No HTTP tests in the initial implementation.** The only non-framework behavior was the body literal; covering it would test Fastify, not our code. Test infrastructure (`app.inject()`) enters the codebase alongside the first route with real logic.
- **Graceful shutdown deferred.** `SIGTERM` / `SIGINT` → `app.close()` is not wired. Acceptable while there are no stateful dependencies (DB pool, LLM calls, SSE). Revisited when the first dependency needs draining.
