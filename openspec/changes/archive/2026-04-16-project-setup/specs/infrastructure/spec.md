# Spec: Project Setup — Infrastructure

Status: approved
Domain: infrastructure
Change: project-setup

## Expected Behavior

**Docker startup**

- Given a `.env` file with `ANTHROPIC_API_KEY`, `REPO_PATH`, `SKILLS_PATH` set,
  When `docker compose up` is run,
  Then both `app` and `db` services start without errors.

- Given both services are running,
  When a request is made to `http://localhost:3000`,
  Then the app container responds (any HTTP response — server not fully wired yet).

- Given `db` service starts for the first time,
  When Postgres initialises,
  Then `sql/init.sql` runs automatically and `threads` and `messages` tables exist.

- Given `db` service has already been started once,
  When `docker compose up` is run again,
  Then `sql/init.sql` does NOT run again (Postgres init scripts run only on empty data volume).

**Database schema**

- Given the `threads` table exists,
  When inspected,
  Then it has columns: `id` (UUID PK), `change_name` (TEXT nullable), `repo_path` (TEXT not null), `phase` (TEXT not null default `'intake'`), `status` (TEXT not null default `'active'`), `created_at`, `updated_at` (TIMESTAMPTZ).

- Given the `messages` table exists,
  When inspected,
  Then it has columns: `id` (UUID PK), `thread_id` (UUID FK → threads.id), `role` (TEXT not null), `content` (TEXT not null), `phase` (TEXT not null), `metadata` (JSONB default `{}`), `created_at` (TIMESTAMPTZ).

**Local development**

- Given `npm install` has been run,
  When `npm run dev` is executed,
  Then the TypeScript compiler (via `tsx`) starts without type errors.

- Given `npm install` has been run,
  When `npm test` is executed,
  Then Vitest exits 0 (no test files yet is a passing run).

**Environment variables**

- Given `.env.example` exists,
  When a developer sets up the project,
  Then copying `.env.example` to `.env` and filling in values is sufficient to run the project.

## Business Rules

- BR-01: The `app` container MUST NOT start if `DATABASE_URL` is not set.
- BR-02: `ANTHROPIC_API_KEY` MUST NOT appear in any committed file. Only in `.env` (gitignored).
- BR-03: `REPO_PATH` and `SKILLS_PATH` MUST be absolute paths on the host, mounted as read-write volumes.

## Edge Cases

- If `docker compose up` is run without a `.env` file, Docker Compose prints a warning for missing variables but still starts (variables will be empty). Document in README.
- If `REPO_PATH` does not exist on the host, the volume mount fails silently — the container starts but `/repo` is empty. Document in README.

## Decisions Made

- PostgreSQL init via `/docker-entrypoint-initdb.d/` — standard, no custom entrypoint needed.
- `pg_extension` `uuid-ossp` used for `gen_random_uuid()` — available in standard Postgres 16 image.
- No migration tooling in IT-0 — `sql/init.sql` is the schema. Migrations added when schema evolves.
