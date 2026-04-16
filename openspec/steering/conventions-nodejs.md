# Specialist: Node.js Patterns

> Event loop health, functional design, and idiomatic Node.js.
> Read by sdd-apply, sdd-audit, and sdd-verify.
> Violations marked **Critical** block PRs. Others are warnings.

## Event loop — Critical

The Node.js event loop is single-threaded. Any synchronous operation that takes more than ~1ms
on the hot path starves all concurrent requests.

- **MUST NOT** call synchronous I/O (`fs.readFileSync`, `fs.writeFileSync`, `execSync`, `spawnSync`) inside request handlers, pipeline phases, or any code reachable from an active request. Use async equivalents.
- **MUST NOT** run CPU-intensive synchronous loops (large array sorts, regex on unbounded strings, JSON parsing of multi-MB payloads) on the main thread. Offload to a worker thread or split into async chunks with `setImmediate`.
- **MUST NOT** use `JSON.parse` or `JSON.stringify` on payloads larger than ~100 KB without streaming. Prefer streaming JSON parsers for large inputs.
- **SHOULD** measure perceived latency with `process.hrtime.bigint()` around any operation suspected of blocking. If it exceeds 5ms on the hot path, offload it.

```ts
// ✗ blocks event loop — all concurrent requests stall
const content = fs.readFileSync(path, 'utf8');

// ✓ yields to event loop
const content = await fs.promises.readFile(path, 'utf8');
```

## Functional design

- **MUST NOT** mutate function arguments. Return new values instead.
- **MUST NOT** use shared mutable module-level state (mutable `let` or mutable objects at module scope that change during request handling). Configuration and constants are fine; request-scoped state is not.
- **SHOULD** prefer pure functions: same inputs always produce same outputs, no observable side effects. Move side effects (I/O, DB, logging) to the edges of the call graph.
- **SHOULD** use `Object.freeze` on value objects and domain entities that must not change after construction.
- **SHOULD** express data transformations with `map`, `filter`, `reduce`, and `flatMap` rather than imperative loops with accumulator mutation.

```ts
// ✗ mutates argument
function normalise(phases: string[]): string[] {
  for (let i = 0; i < phases.length; i++) phases[i] = phases[i].toLowerCase();
  return phases;
}

// ✓ returns new array
const normalise = (phases: string[]): string[] => phases.map(p => p.toLowerCase());
```

## Immutability

- **MUST** prefer `const` over `let`. Only use `let` when reassignment is genuinely needed.
- **MUST NOT** use `var`. (`noVar` Biome rule enforces this, but worth stating the reason: `var` has function scope and hoisting that breaks predictability.)
- **SHOULD** use spread (`{ ...obj, key: value }`) and array spread (`[...arr, item]`) for updates rather than mutating properties in place.
- **SHOULD** type collections as `ReadonlyArray<T>` or `readonly T[]` when a function must not modify them.

## Pure functions and side effects

- **SHOULD** keep domain functions pure — no logging, no timestamps, no random, no I/O. Pass these as dependencies if needed.
- **SHOULD** isolate side effects at the infrastructure boundary (see clean-arch specialist). Domain and application functions that are pure are trivially testable.
- **SHOULD** avoid `Date.now()` and `Math.random()` in domain logic. Inject a clock/random source so tests are deterministic.

## Streams and backpressure

- **SHOULD** use `stream.pipeline` (or its promisified form `stream/promises.pipeline`) instead of manual `.pipe()`. `pipeline` handles cleanup on error automatically; `.pipe()` does not.
- **MUST** respect backpressure: do not write to a writable stream when `write()` returns `false`. Wait for the `drain` event. Ignoring backpressure causes unbounded memory growth.
- **SHOULD** prefer async iterators (`for await...of readable`) over event-based stream consumption for clarity.

```ts
// ✓ pipeline handles backpressure and cleanup
import { pipeline } from 'node:stream/promises';
await pipeline(readableSource, transformStream, writableDest);
```

## Worker threads for CPU-bound work

- **MUST** offload CPU-bound work that takes >10ms to a `worker_thread`. Examples: large file parsing, diff computation, token counting, zip/unzip.
- **MUST NOT** spawn a new worker per request. Use a worker pool and reuse workers across requests.
- **SHOULD** communicate with workers via `MessageChannel` with structured-cloneable data. Do not share mutable state via `SharedArrayBuffer` unless you have a specific measured need.

## Module design

- **MUST** use ESM (`import`/`export`). No `require()` or `module.exports` in new code.
- **MUST NOT** create barrel files (`index.ts` that re-exports everything) for large modules. Barrel files defeat tree-shaking and make dependency graphs opaque.
- **SHOULD** export functions and types, not class instances or singletons from modules. Singletons at module scope become hidden global state.
- **SHOULD** keep modules small and focused. A module that exports more than ~5 things is probably doing too much.

## Memory

- **MUST** remove event listeners when they are no longer needed. Forgotten listeners are the most common Node.js memory leak.
- **MUST NOT** cache unbounded collections in module scope. Define a maximum size and evict (LRU or TTL).
- **SHOULD** prefer streaming over loading entire files into memory when processing large inputs from user repos.

## How to detect violations

When reviewing code during sdd-apply or sdd-audit, flag:
1. `readFileSync`, `writeFileSync`, `execSync`, `spawnSync` outside of CLI scripts or startup code
2. Mutable `let` or mutable object at module scope that is written to during request handling
3. Function that mutates its array or object argument in place
4. `.pipe()` without an `error` handler on every stream in the chain
5. `new Worker(...)` inside a request handler (per-request worker allocation)
6. `require()` in ESM files (`.ts` with `"type": "module"` in package.json)
7. `Date.now()` or `Math.random()` inside a domain function without injection
8. `JSON.parse` on `req.body` or file content without a size guard
