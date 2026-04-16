# Tech Stack: SDD Coder

## Language & runtime

- TypeScript 5 (strict mode)
- Node.js 24 LTS

## Framework & key dependencies

- **Fastify 5** — HTTP server, REST API, serves static UI
- **@anthropic-ai/sdk** — Claude API (Sonnet for production, Haiku for integration tests)
- **pg (node-postgres)** — PostgreSQL driver, no ORM
- **Vitest** — test runner (unit + integration)
- **tsx** — TypeScript runner for development (no build step in dev)

## Infrastructure

- **PostgreSQL 16** — conversation state, thread/message/artifact storage. pgvector added in IT-4.
- **Docker Compose** — two services: `app` (Node.js) + `db` (Postgres)
- Two mounted volumes: `/repo` (target user repo), `/skills` (sdd-skills directory)

## Tools

- Package manager: npm
- Linter/formatter: to be decided at project setup (ESLint + Prettier or Biome)
- Git: all operations via `child_process` (git CLI + gh CLI)

## Required environment variables

- `ANTHROPIC_API_KEY` — Anthropic API key
- `REPO_PATH` — absolute path to the target repo on the host
- `SKILLS_PATH` — absolute path to the sdd-skills directory on the host
- `DATABASE_URL` — PostgreSQL connection string (set by Docker Compose)

## Environments

- **Dev**: `tsx src/server.ts` (no build step)
- **Docker**: `docker compose up` — starts app + postgres
- **Test (unit)**: `vitest run` — no API key needed, Claude is mocked
- **Test (integration)**: `vitest run --reporter=verbose` — requires `ANTHROPIC_API_KEY`, uses Claude Haiku

## Dev commands (to be updated at project setup)

```bash
npm run dev       # tsx src/server.ts
npm test          # vitest run
npm run test:int  # vitest run --config vitest.integration.ts
docker compose up # full stack
```
