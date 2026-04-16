# Specialist: Async Node.js

> Rules for correct async/concurrency patterns in Node.js backends.
> Read by sdd-apply, sdd-audit, and sdd-verify.
> Violations marked **Critical** block PRs. Others are warnings.

## async/await

- **MUST** use `async/await` throughout. Never mix `.then()`/`.catch()` chains with `await` in the same function — pick one style per codebase and stick to it.
- **MUST** `await` every Promise that can reject. Floating Promises (calling an async function without `await` and without `.catch()`) cause silent failures.
- **MUST NOT** use `new Promise()` wrappers around code that is already Promise-based. Only use `new Promise()` to promisify genuinely callback-based APIs.
- **MUST NOT** use `async` on a function and then never `await` inside it. Either the function needs `await` or it should not be `async`.
- **SHOULD** mark intentionally fire-and-forget calls with a `void` prefix (`void sendMetric()`) so readers know the omission is deliberate, not a bug.

## Error handling

- **MUST** wrap every `await` that can reject in a try/catch, or let the error propagate to a boundary handler that is guaranteed to catch it (e.g. Fastify's global error handler).
- **MUST NOT** swallow errors silently in catch blocks. At minimum, log the error with context before discarding it.
- **MUST** register a process-level `unhandledRejection` handler that logs and exits cleanly. Never rely on Node's default behavior to surface these in production.
- **SHOULD** use a single error-boundary pattern per layer: routes catch and return HTTP errors, pipeline catches and updates thread status, LLM layer throws typed errors upward.

## child_process (git, gh CLI)

- **MUST** use `execFile` or `spawn` with argument arrays, not `exec` with string interpolation. String interpolation enables shell injection when inputs come from user repos.
- **MUST** set a timeout on every `child_process` call. Git operations on large repos and `gh` API calls can hang indefinitely without one.
- **MUST** check the exit code of every shell command. A non-zero exit must be treated as an error and surfaced to the caller — never silently ignored.
- **MUST NOT** pass user-controlled strings (branch names, file paths from repos, commit messages) directly into shell command strings. Validate and sanitize first, or use argument arrays.
- **SHOULD** capture stderr alongside stdout. Many CLI tools (including git) write diagnostic information to stderr even on success.

## Concurrency and parallelism

- **MUST NOT** run unbounded parallel operations with `Promise.all` over user-supplied arrays. Cap concurrency with a semaphore or process in batches. Unbounded parallel DB queries or API calls cause resource exhaustion.
- **SHOULD** use `Promise.all` only when all operations are independent and the array size is bounded and known. For variable-length arrays, use a concurrency-limited helper.
- **SHOULD NOT** start multiple pipeline phases concurrently for the same thread. The state machine must enforce sequential phase execution per thread.

## Timeouts and deadlines

- **MUST** set an explicit timeout on every outbound network call (Claude API, PostgreSQL queries, child_process). Never rely on OS-level or library defaults alone.
- **MUST** propagate cancellation when a request is aborted (e.g. HTTP client disconnects). Do not continue processing a pipeline phase for a client that has gone away.
- **SHOULD** define timeout constants at the module level, not inline. Makes them easy to find, tune, and test.

## Streams

- **SHOULD** use streams for large file reads from the target repo instead of `fs.readFile` into memory. Files in user repos can be arbitrarily large.
- **MUST** handle `error` events on all readable/writable streams. An unhandled stream error crashes the process in Node.js.
- **MUST NOT** buffer an entire stream into a string before checking its size. Check size as you read and abort early if it exceeds the limit.

## How to detect violations

When reviewing code during sdd-apply or sdd-audit, flag:
1. `async function` with no `await` inside
2. Promise returned from a function call with no `await`, `void`, or `.catch()`
3. `.then().catch()` chains mixed with `await` in the same file
4. `exec(` with template literals or string concatenation
5. `Promise.all(array.map(...))` where `array` comes from user input or external data
6. Missing timeout option on `pg.query`, `fetch`, `axios`, or `child_process` calls
7. Empty `catch` blocks or `catch (e) {}` with no logging
8. `new Promise()` wrapping an already-Promise-returning function
