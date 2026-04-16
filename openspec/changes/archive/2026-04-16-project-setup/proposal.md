# Proposal: Project Setup

## Context

SDD Coder is a new TypeScript/Node.js project. The repo has planning documents and openspec/ but no runnable code. Before any feature can be built or tested, the project scaffolding must exist.

## Problem

There is no `package.json`, no TypeScript config, no Docker setup, and no database schema. The project cannot be started, built, or tested. All subsequent changes depend on this foundation.

## Scope

**In scope:**
- `package.json` — dependencies, dev dependencies, npm scripts
- `tsconfig.json` — TypeScript 5 strict config
- `docker-compose.yml` — `app` (Node.js) + `db` (PostgreSQL 16) services with volumes
- `Dockerfile` — multi-stage: dev (tsx) + prod (compiled)
- `.env.example` — documents all required environment variables
- `sql/init.sql` — schema for `threads` and `messages` tables
- `README.md` — minimal setup instructions (prerequisites, how to run, first task example)

**Out of scope:**
- Application code (`src/`) — that comes in subsequent changes
- UI files (`ui/`) — separate change
- CI/CD configuration — IT-3
- Any npm scripts beyond `dev`, `build`, `test`, `test:int`

## Proposed Solution

Standard Node.js + TypeScript project scaffold following the decisions in `openspec/steering/tech.md`:
- Runtime: Node.js 24
- Language: TypeScript 5, strict mode
- Framework: Fastify 5 (declared as dependency, not yet wired)
- LLM: `@anthropic-ai/sdk` (declared, not yet wired)
- DB: `pg` driver for PostgreSQL
- Tests: Vitest
- Dev runner: `tsx`

Docker Compose runs two services: `app` mounts `/repo` and `/skills` as volumes from host paths defined in `.env`. Postgres 16 auto-runs `sql/init.sql` via the official image's `/docker-entrypoint-initdb.d/` convention.

## Alternatives Discarded

| Alternative | Reason discarded |
|---|---|
| pnpm instead of npm | Extra tooling with no benefit for a single-package project. npm suffices. |
| Bun | Immature ecosystem for production TypeScript server apps. Node.js 24 is stable. |
| Pre-existing starter template | Would pull opinionated choices that conflict with our stack decisions. Start clean. |
| Single-stage Dockerfile | Dev and prod have different runners (tsx vs compiled). Two stages is cleaner. |
| ORM (Drizzle, Prisma) | Schema is small and stable. Raw `pg` is transparent and requires no codegen. |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Docker networking between app and db | Use service name `db` as hostname; Postgres exposes port 5432 internally |
| TypeScript strict mode breaks later | Enforce from day 1 — cheaper than retrofitting |
| `sql/init.sql` runs only on first postgres start | Known Docker behaviour — document in README; `docker compose down -v` to reset |

## Impact

- **Files created**: 7 (`package.json`, `tsconfig.json`, `docker-compose.yml`, `Dockerfile`, `.env.example`, `sql/init.sql`, `README.md`)
- **Files modified**: none
- **Enables**: all subsequent `src/` changes

## Dependencies

None. This is the foundational change.

## Acceptance Criteria

- `docker compose up` starts both services without errors
- App container is accessible at `http://localhost:3000` (returns 404 or similar — server not wired yet, but container runs)
- `npm install` completes without errors
- `npm run dev` starts without TypeScript errors (even with empty src/)
- `npm test` exits 0 (no tests yet — that's passing)
- Postgres `threads` and `messages` tables exist after first start
