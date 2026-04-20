# Exploration Notes: bootstrap-fastify-server

## Prior Decisions

- **infrastructure** (`project-setup`): `docker-compose.yml` already maps `${PORT:-3000}:3000` and the `app` service starts with `npx tsx src/server.ts`. The container currently fails at boot because `src/server.ts` does not exist — this change unblocks that.
- **infrastructure**: `sql/init.sql` and DB readiness (healthcheck) already wired. `DATABASE_URL` is injected into the `app` container. Connecting the server to the DB is deliberately out of scope for `project-setup`.
- **tooling** (`add-biome-linting`, `add-pre-commit-hook`): Biome + `simple-git-hooks` pre-commit enforces `npm run check` on every commit. New code must pass Biome.

## Relevant Files

- `src/server.ts` — **does not exist**. To be created. Referenced by `package.json` (`dev` script) and `Dockerfile` (`CMD`).
- `package.json` — Fastify 5 and `@anthropic-ai/sdk` already declared as dependencies. `tsconfig.json` configured for strict TypeScript 5.
- `openspec/steering/structure.md` — dictates clean-architecture layout. `src/server.ts` is the composition root; the HTTP layer lives at `src/infrastructure/http/server.ts`. Health endpoint would be a route under `src/infrastructure/http/routes/`.
- `openspec/steering/conventions.md` — MUST handle errors at route boundary with structured JSON (not stack traces); Fastify global error handler required.
- `openspec/steering/conventions-nodejs.md` — ESM only, no `require`, no sync I/O on hot path.
- `openspec/specs/infrastructure/spec.md` — current acceptance: "when request made to localhost:3000, app container responds (any HTTP response — server not fully wired yet)". This change upgrades that to a proper `200 OK` on a known endpoint.

## Existing Patterns

- None yet — `src/` is empty. This is the first piece of runtime code in the project and will set the pattern for composition-root + HTTP layer.

## Relevant Specs

- `openspec/specs/infrastructure/spec.md` — this change adds HTTP-server behavior; likely becomes a new `http` (or `server`) canonical spec, or extends `infrastructure`.

## Key Constraints

- **Docker host binding**: Fastify inside Docker must bind to `0.0.0.0`, not the default `localhost`, or the container is unreachable from the host.
- **Strict TS, no `any`**: enforced by Biome (`suspicious/noExplicitAny: "error"`).
- **Error boundary**: a global Fastify error handler is mandatory per `conventions.md` ("MUST catch errors at the route boundary...").
- **Port**: `docker-compose.yml` uses `${PORT:-3000}` on the host side; the container port is hardcoded to 3000. Server should listen on `3000` inside the container (or read from env).
- **No DB yet**: the DB is healthy before `app` starts (compose `depends_on: service_healthy`), but wiring `pg` and using it from the server is out of scope of `project-setup`. Whether to wire a minimal DB ping into `/health` is an open scope question for this change.
