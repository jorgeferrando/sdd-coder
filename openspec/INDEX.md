# OpenSpec Index

> Index of canonical domains. Updated by sdd-archive on each change.
> **Usage:** read this file first; load only the spec files relevant to the change.
> If this file does not exist, scan openspec/specs/ directly.

---

## tooling (`specs/tooling/spec.md`)
Biome lint + format + pre-commit hook. Single tool for linting, formatting, and import organisation. Hook enforces quality gate on every commit automatically.
**Entities:** `biome.json`, `npm run lint`, `npm run fmt`, `npm run check`, `.git/hooks/pre-commit`, `simple-git-hooks`
**Keywords:** biome, lint, format, noExplicitAny, organizeImports, pre-commit, hook, simple-git-hooks

## infrastructure (`specs/infrastructure/spec.md`)
Docker Compose setup (app + db), PostgreSQL schema, environment variables, and local development workflow for SDD Coder.
**Entities:** `threads`, `messages`, `docker-compose.yml`, `sql/init.sql`, `Dockerfile`
**Keywords:** docker, postgres, schema, environment, setup, volumes, init

## http (`specs/http/spec.md`)
Fastify 5 server surface. Liveness endpoint `GET /health`, default error and not-found handlers, structured pino logging, explicit `0.0.0.0:3000` bind for Docker reachability.
**Entities:** `src/server.ts`, `GET /health`, `{"status":"ok"}`, `app.listen`, `logger: true`, port `3000`, host `0.0.0.0`
**Keywords:** fastify, server, health, liveness, endpoint, http, pino, logger, 404, error-handler
