# Tasks: Project Setup

Change: project-setup
Branch: main (scaffold — no feature branch needed for initial project setup)
Date: 2026-04-16

## Implementation Tasks

- [x] **T01** Create `package.json`
  - npm manifest with `"type": "module"`, all deps and devDeps, npm scripts
  - deps: `fastify@^5`, `@anthropic-ai/sdk`, `pg`
  - devDeps: `typescript@^5`, `tsx`, `vitest`, `@types/pg`, `@types/node`
  - scripts: `dev` (tsx src/server.ts), `build` (tsc), `test` (vitest run), `test:int` (vitest run --config vitest.integration.ts)
  - vitest config inline (`"vitest"` key): `globals: true`, `environment: "node"`
  - Commit: `[project-setup] Add package.json`

- [x] **T02** Create `tsconfig.json`
  - Depends on: T01 (npm install will validate it)
  - target: ES2022, module: NodeNext, moduleResolution: NodeNext
  - strict: true, rootDir: src, outDir: dist, sourceMap: true
  - include: ["src"], exclude: ["node_modules", "dist"]
  - Commit: `[project-setup] Add tsconfig.json`

- [x] **T03** Create `sql/init.sql`
  - No dependencies
  - CREATE EXTENSION IF NOT EXISTS pgcrypto
  - CREATE TABLE threads (id UUID PK gen_random_uuid(), change_name TEXT, repo_path TEXT NOT NULL, phase TEXT NOT NULL DEFAULT 'intake', status TEXT NOT NULL DEFAULT 'active', created_at/updated_at TIMESTAMPTZ DEFAULT now())
  - CREATE TABLE messages (id UUID PK, thread_id UUID REFERENCES threads ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, phase TEXT NOT NULL, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now())
  - Commit: `[project-setup] Add sql/init.sql`

- [x] **T04** Create `Dockerfile`
  - No dependencies
  - Stage dev: node:24-slim, WORKDIR /app, COPY package*.json, RUN npm ci, COPY . ., CMD npx tsx src/server.ts
  - Stage prod: same base, RUN npm ci --omit=dev && npm run build, CMD node dist/server.js
  - Commit: `[project-setup] Add Dockerfile`

- [x] **T05** Create `docker-compose.yml`
  - Depends on: T03 (references sql/init.sql), T04 (references Dockerfile)
  - app service: build target dev, ports 3000:3000, volumes REPO_PATH:/repo + SKILLS_PATH:/skills, env_file .env, depends_on db
  - db service: postgres:16, named volume pgdata, mounts sql/init.sql to /docker-entrypoint-initdb.d/init.sql, env vars POSTGRES_USER/PASSWORD/DB
  - Commit: `[project-setup] Add docker-compose.yml`

- [x] **T06** Create `.env.example`
  - Depends on: T05 (documents vars used in compose)
  - ANTHROPIC_API_KEY=, REPO_PATH=, SKILLS_PATH=, POSTGRES_USER=sdd, POSTGRES_PASSWORD=sdd, POSTGRES_DB=sdd, DATABASE_URL=postgresql://sdd:sdd@db:5432/sdd, PORT=3000
  - Commit: `[project-setup] Add .env.example`

- [x] **T07** Create `README.md`
  - Depends on: T01-T06 (documents the full setup)
  - Prerequisites, clone, cp .env.example .env, docker compose up, npm run dev, reset DB command
  - Under 50 lines
  - Commit: `[project-setup] Add README.md`

## Quality Gate

- [x] **QG** Run `npm install` → exits 0
- [x] **QG** Run `npm test` → exits 0 (no test files yet is a pass)
- [x] **QG** Run `docker compose up` → both services start without errors
- [x] **QG** Postgres `threads` and `messages` tables exist after first start
- [x] **QG** `docker compose down -v && docker compose up` → clean reset works
