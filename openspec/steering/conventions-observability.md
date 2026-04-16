# Specialist: Observability

> Structured logging, correlation IDs, and traceable async operations.
> Read by sdd-apply, sdd-audit, and sdd-verify.
> Violations marked **Critical** block PRs. Others are warnings.

## Structured logging — Critical

- **MUST** log as JSON, not free-form strings. Every log entry is a parseable object. Free-form strings are unsearchable in production.
- **MUST** include at minimum: `{ level, timestamp, message, ...context }`. Never log a bare string with no context fields.
- **MUST NOT** use `console.log`, `console.error`, or `console.warn` in application or infrastructure code. Use the project logger. `console.*` is acceptable only in CLI scripts and startup boot messages.
- **SHOULD** use a lightweight structured logger (e.g. Fastify's built-in `pino`) rather than building a custom one. `pino` is already available via Fastify and outputs JSON by default.

```ts
// ✗ unsearchable, no context
console.log('Phase advanced to ' + phase);

// ✓ structured, searchable
logger.info({ threadId, phase, previousPhase }, 'Phase advanced');
```

## Log levels

Use levels with discipline — noisy logs are as useless as no logs:

| Level | When to use |
|---|---|
| `error` | An operation failed and cannot recover. Requires attention. Always include `err` field with the Error object. |
| `warn` | Something unexpected happened but the operation continued. Worth investigating if frequent. |
| `info` | A significant business event completed: thread created, phase advanced, commit made. |
| `debug` | Detailed internal state useful during development. Must be silent in production (log level configured via env). |
| `trace` | Very granular: individual prompt tokens, DB query timings. Never enabled in production. |

- **MUST NOT** log routine operations at `error` level. Reserve `error` for genuine failures.
- **MUST NOT** log at `debug` or `trace` in production by default. Gate with `LOG_LEVEL` env var.
- **SHOULD** log every significant state transition at `info`: thread created, phase started, phase completed, commit made, error returned to user.

## Correlation IDs — Critical for async pipelines

- **MUST** attach a `threadId` to every log entry produced while processing a thread. Without it, interleaved logs from concurrent threads are impossible to untangle.
- **MUST** attach a `phase` field to every log entry produced inside a phase handler.
- **SHOULD** attach a `requestId` (from Fastify's `req.id`) to every log entry produced during an HTTP request.
- **SHOULD** propagate correlation fields by passing a child logger through the call stack, not by reading them from a global:

```ts
// ✓ child logger carries context automatically
const phaseLogger = logger.child({ threadId, phase });
phaseLogger.info('Starting phase');           // → { threadId, phase, message: 'Starting phase' }
phaseLogger.info({ fileCount: 3 }, 'Context gathered');  // → { threadId, phase, fileCount, ... }
```

## What to log

Log events that answer: *what happened, to which thread, in which phase, and with what outcome?*

| Event | Level | Required fields |
|---|---|---|
| HTTP request received | `info` (Fastify auto) | `requestId`, `method`, `url` |
| Thread created | `info` | `threadId`, `repoPath` |
| Phase started | `info` | `threadId`, `phase` |
| Phase completed | `info` | `threadId`, `phase`, `durationMs` |
| Claude call made | `debug` | `threadId`, `phase`, `model`, `inputTokens` |
| Claude call completed | `debug` | `threadId`, `phase`, `outputTokens`, `durationMs` |
| Git commit made | `info` | `threadId`, `commitHash`, `message` |
| Result error returned | `warn` | `threadId`, `phase`, `errorKind` |
| Infrastructure exception caught | `error` | `threadId`, `phase`, `err` |

## What NEVER to log — Critical

- **MUST NOT** log `ANTHROPIC_API_KEY`, `DATABASE_URL`, or any secret or credential.
- **MUST NOT** log the full content of files read from the target repo — they may contain secrets.
- **MUST NOT** log the full prompt sent to Claude — it contains repo content that may be sensitive.
- **MUST NOT** log the full Claude response — it may contain generated code with secrets.
- **SHOULD** log token counts and model names, but not the prompt/response text above `debug` level, and even at `debug` truncate to the first 200 chars.
- **MUST NOT** log user-identifying information (email, name, IP) unless required and documented.

## Timing and performance

- **SHOULD** log `durationMs` for every phase execution and every Claude API call. These are the two slowest operations and the most useful for diagnosing latency.
- **SHOULD** use `process.hrtime.bigint()` for timing, not `Date.now()` (higher resolution, monotonic):

```ts
const start = process.hrtime.bigint();
const result = await callClaude(prompt);
const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
logger.debug({ durationMs, model }, 'Claude call completed');
```

## Error logging

- **MUST** include the `err` field (the actual Error object) when logging at `error` level. Pino serialises it automatically including stack trace.
- **MUST** log infrastructure exceptions at `error` before converting them to `Result`. The Result carries a typed error for the caller; the log carries the full stack trace for debugging.
- **MUST NOT** log the same error at multiple levels as it propagates. Log once at the boundary where it is caught.

```ts
// ✓ log at catch boundary, return Result — single log per error
try {
  const row = await pool.query(...);
  return ok(toThread(row.rows[0]));
} catch (e) {
  logger.error({ err: e, threadId }, 'DB query failed');
  return err({ kind: 'db_error', cause: e });
}
```

## How to detect violations

When reviewing code during sdd-apply or sdd-audit, flag:
1. `console.log`, `console.error`, `console.warn` outside of server startup or CLI scripts
2. Log entries with no `threadId` field inside phase handlers or use cases
3. `logger.error(...)` called for an expected domain error (validation failure, not-found)
4. `logger.info(...)` called inside a tight loop (per-iteration logs at info level)
5. Full prompt or full file content passed to any logger at any level
6. `ANTHROPIC_API_KEY`, `DATABASE_URL`, or any env var value in a log message
7. Error logged at multiple levels as it propagates up the stack
