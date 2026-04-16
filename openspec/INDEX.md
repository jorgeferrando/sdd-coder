# OpenSpec Index

> Index of canonical domains. Updated by sdd-archive on each change.
> **Usage:** read this file first; load only the spec files relevant to the change.
> If this file does not exist, scan openspec/specs/ directly.

---

## tooling (`specs/tooling/spec.md`)
Biome lint + format configuration. Single tool for linting, formatting, and import organisation across all TypeScript source files.
**Entities:** `biome.json`, `npm run lint`, `npm run fmt`, `npm run check`
**Keywords:** biome, lint, format, noExplicitAny, organizeImports, scripts, check

## infrastructure (`specs/infrastructure/spec.md`)
Docker Compose setup (app + db), PostgreSQL schema, environment variables, and local development workflow for SDD Coder.
**Entities:** `threads`, `messages`, `docker-compose.yml`, `sql/init.sql`, `Dockerfile`
**Keywords:** docker, postgres, schema, environment, setup, volumes, init
