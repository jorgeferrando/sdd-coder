# Conventions: SDD Coder

> Rules that cause PR review failures. RFC 2119 levels: MUST / MUST NOT / SHOULD / MAY.
> Source of truth for /sdd-audit.

## Bootstrap decisions

- Architecture: single service (monolith). No split into gateway/agent until there is a measured reason.
- LLM integration: hybrid — skill instructions as prompts, TypeScript handles all I/O.
- Testing: AI decides per task (TDD for logic-heavy code, tests-after for wiring/config).
- Commit format: `[{change-name}] Description in English, imperative mood` (max 70 chars first line).
- Language: TypeScript strict mode throughout. No `any`, no `as unknown`.

## TypeScript

- **MUST** enable `strict: true` in tsconfig. No exceptions.
- **MUST NOT** use `any`. Use `unknown` and narrow with type guards.
- **MUST NOT** use non-null assertion (`!`) unless the null case is structurally impossible and commented.
- **SHOULD** prefer `type` over `interface` for object shapes unless extension is needed.
- **SHOULD** export types from `src/types.ts` when shared across modules.

## Architecture & layers

- **MUST NOT** import from `pipeline/` into `llm/`, `git/`, or `db/`. Dependencies flow downward: routes → pipeline → llm/git/db.
- **MUST NOT** perform file I/O or git operations inside `src/llm/`. The LLM layer only calls Claude and parses JSON.
- **MUST NOT** perform direct Postgres queries outside `src/db/queries.ts`.
- **MUST** keep phase handlers (`src/pipeline/phases/*.ts`) free of HTTP concerns (no `req`/`reply` objects).
- **SHOULD** keep each phase handler under 100 lines. Extract helpers if needed.

## Git operations (on /repo)

- **MUST NOT** commit to `main` or `develop` in the target repo. Always use `sdd/{change-name}` branches.
- **MUST NOT** include `ANTHROPIC_API_KEY` or any secret in any commit or log.
- **MUST NOT** modify `.env*` files in the target repo.
- **MUST** scan the diff for secret patterns before every commit (block and notify if found).
- **MUST** commit atomically: one logical change per commit, specific file paths (not `git add .`).

## LLM & prompts

- **MUST** validate Claude's response as JSON before using it. If parsing fails, return an error message to the user, do not throw.
- **MUST NOT** send raw secrets, API keys, or `.env` file contents to Claude.
- **SHOULD** cap context sent to Claude per phase at ~4,000 tokens. Use truncation/summarisation for large repos.
- **SHOULD** use Claude Haiku for integration tests, Sonnet for production pipeline runs.

## Error handling

- **MUST** catch errors at the route boundary and return structured JSON errors to the UI, not stack traces.
- **MUST NOT** let unhandled promise rejections crash the server. Use Fastify's global error handler.
- **SHOULD** log errors with enough context to debug (phase, threadId, operation) but never log secrets.

## Testing

- **MUST** write unit tests that run without a network connection and without `ANTHROPIC_API_KEY`.
- **MUST** mock Claude responses using fixture files in `test/fixtures/`.
- **MUST NOT** use `Math.random()` or `Date.now()` in tests without mocking — tests must be deterministic.
- **SHOULD** name tests as behaviour descriptions: `"advances phase to propose when intake is complete"`.

## Database

- **MUST** use parameterised queries. No string interpolation in SQL.
- **MUST NOT** use `SELECT *` in application code. Always name the columns.
- **SHOULD** keep all SQL in `src/db/queries.ts`. No raw SQL in route handlers or pipeline code.

## UI

- **MUST NOT** import external JS libraries via CDN in `ui/index.html` without pinning the version.
- **MUST NOT** store `ANTHROPIC_API_KEY` or any secret in the browser or in UI code.
- **SHOULD** keep `ui/app.js` under 300 lines. Extract modules if it grows beyond that.
