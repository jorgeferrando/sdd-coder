# Specialist: Result Pattern

> Models expected errors as values. Reserves try/catch for infrastructure boundaries only.
> Read by sdd-apply, sdd-audit, and sdd-verify.
> Violations marked **Critical** block PRs. Others are warnings.

## Canonical type

Use this home-grown `Result<T, E>` type — no external library needed:

```ts
// src/types/result.ts
export type Result<T, E = string> =
  | { ok: true;  value: T }
  | { ok: false; error: E };

export const ok  = <T>(value: T): Result<T, never> => ({ ok: true,  value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

All domain and application code imports only from this file. Never redefine Result locally.

## Where to use Result vs throw

- **MUST** return `Result<T, E>` for any operation that has expected failure modes: validation errors, not-found, business rule violations, parse failures.
- **MUST NOT** `throw` from domain or application layer functions. Throwing is reserved for bugs (programming errors), not expected domain errors.
- **MUST** use try/catch **only** at infrastructure boundaries: database calls, filesystem access, external HTTP/API calls, child_process. Convert the caught exception to `Result` immediately and do not re-throw.
- **MUST NOT** let infrastructure exceptions propagate into domain or application code uncaught. The boundary adapter is responsible for the conversion.

```ts
// ✓ infrastructure boundary — the ONE place try/catch lives
async function findThread(id: string): Promise<Result<Thread, DbError>> {
  try {
    const row = await pool.query('SELECT ...', [id]);
    return row.rows.length ? ok(toThread(row.rows[0])) : err({ kind: 'not_found' });
  } catch (e) {
    return err({ kind: 'db_error', cause: e });
  }
}

// ✓ domain/application — no try/catch, just Result
function validatePhase(phase: string): Result<Phase, string> {
  const valid = ['intake', 'propose', 'spec', 'design', 'tasks', 'apply'];
  return valid.includes(phase) ? ok(phase as Phase) : err(`Unknown phase: ${phase}`);
}
```

## Chaining and composition

- **MUST NOT** unwrap a Result with `if (!result.ok) throw` inside domain/application code — that re-introduces implicit throws. Return the error upward instead.
- **SHOULD** add `map` and `flatMap` helpers to avoid nested if-chains:

```ts
// src/types/result.ts (extend the file, not a new one)
export function map<T, U, E>(r: Result<T, E>, f: (v: T) => U): Result<U, E> {
  return r.ok ? ok(f(r.value)) : r;
}

export function flatMap<T, U, E>(r: Result<T, E>, f: (v: T) => Result<U, E>): Result<U, E> {
  return r.ok ? f(r.value) : r;
}
```

- **SHOULD** use a `match` helper at boundaries (route handlers, pipeline phase outputs) to make both branches explicit:

```ts
export function match<T, E, U>(r: Result<T, E>, onOk: (v: T) => U, onErr: (e: E) => U): U {
  return r.ok ? onOk(r.value) : onErr(r.error);
}
```

## Route handlers (Fastify)

The HTTP layer is an infrastructure boundary. It is the only place that unwraps Results to HTTP responses:

```ts
// ✓ route handler unwraps Result into HTTP response
fastify.get('/threads/:id', async (req, reply) => {
  const result = await getThread(req.params.id);   // returns Result<Thread, AppError>
  return match(result,
    thread => reply.send(thread),
    error  => reply.code(errorToStatus(error)).send({ error: error.message }),
  );
});
```

- **MUST NOT** call `reply.send` or `reply.code` from inside domain or application functions. HTTP concerns stop at the route handler.

## Error types

- **SHOULD** define a typed error union per domain, not bare strings:

```ts
type ThreadError =
  | { kind: 'not_found';   id: string }
  | { kind: 'invalid_phase'; phase: string }
  | { kind: 'db_error';    cause: unknown };
```

- **SHOULD NOT** use `Error` objects inside `Result`. Reserve `Error` instances for bugs caught at the process boundary (uncaught exceptions). Domain errors are data, not exceptions.

## Interaction with async/await

- `Result` and `async/await` compose cleanly — `async` functions return `Promise<Result<T,E>>`:

```ts
async function runPhase(threadId: string): Promise<Result<Thread, PhaseError>> {
  const thread = await findThread(threadId);     // Promise<Result<Thread, DbError>>
  if (!thread.ok) return thread;                 // propagate error upward
  const next   = validatePhase(thread.value);    // Result<Phase, string>
  if (!next.ok) return err({ kind: 'invalid_phase', phase: next.error });
  return ok({ ...thread.value, phase: next.value });
}
```

- The only `try/catch` in the chain above lives inside `findThread` (the DB boundary). Everything else is Result propagation.

## How to detect violations

When reviewing code during sdd-apply or sdd-audit, flag:
1. `throw` inside `src/domain/` or `src/application/` (any throw that is not a programming-error guard)
2. `try/catch` inside domain or application functions (not at the infra boundary)
3. `if (!result.ok) throw new Error(...)` — converting Result back to a throw mid-chain
4. Bare `string` used as the error type where a discriminated union would be more precise
5. `new Error()` returned inside a `Result` error field
6. Result left unchecked — function returns `Result<T,E>` but caller uses `.value` without checking `.ok`
