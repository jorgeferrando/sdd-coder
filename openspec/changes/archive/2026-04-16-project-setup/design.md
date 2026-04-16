# Design: Project Setup

Status: ready
Change: project-setup
Phase: design

## Technical Summary

The project scaffold consists of seven files that establish the full development and deployment surface. No application logic is included — this change produces a runnable container skeleton and a typed TypeScript project that compiles clean. The Dockerfile uses a two-stage build: the `dev` stage runs `tsx` directly for fast iteration without a build step; the `prod` stage compiles with `tsc` and runs the output with `node`. Docker Compose wires the two services together and injects all environment variables, including `DATABASE_URL` constructed from Postgres service credentials.

The database schema is applied once via the Postgres image's `/docker-entrypoint-initdb.d/` convention. No migration tooling is introduced at this stage — `sql/init.sql` is the single source of truth for the schema. UUID primary keys use `gen_random_uuid()` from the `pgcrypto` extension (built into Postgres 16, no extra install needed). Foreign key from `messages.thread_id` to `threads.id` is declared with `ON DELETE CASCADE` so deleting a thread removes all its messages.

The TypeScript config targets `ES2022` with `NodeNext` module resolution to match Node.js 24 native ESM. Path aliases are not introduced at this stage since there are no source files yet; they will be added when `src/` is populated. The `tsconfig.json` sets `outDir: dist` and `rootDir: src` so the prod build is clean and predictable. Vitest is configured inline in `package.json` (no separate config file) with `globals: true` to avoid explicit imports in test files.

## Files to Create

| Path | Type | Purpose | Key content |
|---|---|---|---|
| `package.json` | JSON config | npm manifest, scripts, all deps | name `sdd-coder`, `"type": "module"`, scripts: `dev`, `build`, `test`, `test:int`; deps: `fastify@^5`, `@anthropic-ai/sdk`, `pg`; devDeps: `typescript@^5`, `tsx`, `vitest`, `@types/pg`, `@types/node` |
| `tsconfig.json` | JSON config | TypeScript 5 strict compiler config | `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`, `rootDir: src`, `outDir: dist`, `sourceMap: true` |
| `docker-compose.yml` | YAML config | Orchestrate `app` + `db` services | `app` builds from `./Dockerfile` target `dev`, mounts `${REPO_PATH}:/repo` and `${SKILLS_PATH}:/skills`, depends on `db`, env vars from `.env`; `db` uses `postgres:16`, named volume `pgdata`, mounts `./sql/init.sql:/docker-entrypoint-initdb.d/init.sql` |
| `Dockerfile` | Dockerfile | Two-stage image for dev and prod | Stage `dev`: `node:24-slim`, `WORKDIR /app`, `COPY package*.json`, `RUN npm ci`, `COPY . .`, `CMD ["npx", "tsx", "src/server.ts"]`; Stage `prod`: same base, `RUN npm ci --omit=dev && npm run build`, `CMD ["node", "dist/server.js"]` |
| `.env.example` | Shell env template | Documents all required environment variables | `ANTHROPIC_API_KEY=`, `REPO_PATH=`, `SKILLS_PATH=`, `POSTGRES_USER=sdd`, `POSTGRES_PASSWORD=sdd`, `POSTGRES_DB=sdd`, `DATABASE_URL=postgresql://sdd:sdd@db:5432/sdd`, `PORT=3000` |
| `sql/init.sql` | SQL | Schema creation — runs once on first Postgres start | `CREATE EXTENSION IF NOT EXISTS pgcrypto`; `CREATE TABLE threads` with UUID PK, `change_name TEXT`, `repo_path TEXT NOT NULL`, `phase TEXT NOT NULL DEFAULT 'intake'`, `status TEXT NOT NULL DEFAULT 'active'`, `created_at`/`updated_at TIMESTAMPTZ DEFAULT now()`; `CREATE TABLE messages` with UUID PK, `thread_id UUID REFERENCES threads ON DELETE CASCADE`, `role TEXT NOT NULL`, `content TEXT NOT NULL`, `phase TEXT NOT NULL`, `metadata JSONB DEFAULT '{}'`, `created_at TIMESTAMPTZ DEFAULT now()` |
| `README.md` | Markdown | Minimal setup in <50 lines | Prerequisites (Docker, Node 24, npm), clone, `cp .env.example .env` + fill in vars, `docker compose up`, dev workflow, reset DB command |

## Scope Assessment

- **Total files created**: 7
- **Files modified**: 0
- **Classification**: Ideal (< 10 files) — no split required

## Design Decisions

| Decision | Chosen | Alternatives Discarded | Reason |
|---|---|---|---|
| TypeScript module system | `NodeNext` (`"type": "module"` in package.json) | `CommonJS` (`require`), `ESNext` module | Node.js 24 has full ESM support. `NodeNext` enforces correct `.js` extensions in imports, matching Node's native resolution. CommonJS is legacy. |
| UUID generation | `gen_random_uuid()` via `pgcrypto` | `uuid-ossp` extension, application-side `crypto.randomUUID()` | `pgcrypto` is included in the standard Postgres 16 image. `uuid-ossp` requires `CREATE EXTENSION` that isn't always available. Application-side UUIDs are fine but DB-generated is simpler for init SQL. |
| Vitest config location | Inline in `package.json` (`vitest` key) | `vitest.config.ts` separate file | Zero extra files for a scaffold change. A separate config is added later if complexity warrants it. |
| Linter/formatter | Deferred — not in this change | Biome, ESLint + Prettier | `tech.md` marks this as TBD. Adding a linter in the scaffold change would make it harder to separate concerns. A follow-up change (`sdd-new "add linting"`) is cleaner. |
| Dockerfile CMD for dev | `npx tsx src/server.ts` | `node --loader ts-node/esm`, pre-installed global `tsx` | `tsx` is in `devDependencies`. Using `npx tsx` in the container avoids a global install and keeps the image reproducible. `ts-node` ESM loader is experimental. |
| `updated_at` auto-update | Column default `now()`, no trigger | Postgres trigger `BEFORE UPDATE`, application-layer update | At schema-init stage, a trigger is extra complexity. The application layer will set `updated_at` explicitly on UPDATE queries. If drift is detected, a trigger can be added as a migration. |
| `.env` variable for DATABASE_URL | Pre-constructed in `.env.example` | Compose interpolation from parts at runtime | Explicit `DATABASE_URL` in `.env` is simpler for the app — one variable to read. Compose-side interpolation is clever but opaque; rejected per YAGNI. |
