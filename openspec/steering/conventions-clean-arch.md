# Specialist: Clean Architecture

> Enforces domain / application / infrastructure layer separation.
> Business logic never depends on frameworks, databases, or external services.
> Read by sdd-apply, sdd-audit, and sdd-verify.
> Violations marked **Critical** block PRs. Others are warnings.

## Layer definitions

```
src/
├── domain/        # Pure business logic. Zero external dependencies.
├── application/   # Use cases. Orchestrates domain. Depends only on domain + ports.
├── infrastructure/# Implements ports: DB, HTTP, file system, external APIs, CLI tools.
└── ports/         # TypeScript interfaces (contracts) between application and infra.
```

The **dependency rule**: source code dependencies point inward only.

```
infrastructure → application → domain
                     ↑
                   ports (interfaces defined by application, implemented by infrastructure)
```

Domain knows nothing about application. Application knows nothing about infrastructure. Infrastructure knows about everything but is never imported by the inner layers.

## Domain layer (`src/domain/`)

- **MUST NOT** import from `src/application/`, `src/infrastructure/`, or any framework (`fastify`, `pg`, `child_process`, etc.).
- **MUST NOT** perform I/O of any kind: no file reads, no DB queries, no HTTP calls, no `Date.now()` unless injected.
- **MUST** contain: entities, value objects, domain services, domain error types, business rules.
- **MUST** be pure TypeScript: functions in, values out. All dependencies passed as arguments — never imported globals.
- **SHOULD** be fully testable without any mocks: pure functions need no mocking infrastructure.

```ts
// ✓ domain — pure, no imports from outside domain/
export type Phase = 'intake' | 'propose' | 'spec' | 'design' | 'tasks' | 'apply';

export function nextPhase(current: Phase): Result<Phase, string> {
  const sequence: Phase[] = ['intake','propose','spec','design','tasks','apply'];
  const idx = sequence.indexOf(current);
  return idx < sequence.length - 1
    ? ok(sequence[idx + 1])
    : err(`No phase after ${current}`);
}
```

## Application layer (`src/application/`)

- **MUST NOT** import from `src/infrastructure/`. It communicates with infrastructure only through port interfaces defined in `src/ports/`.
- **MUST NOT** reference framework types (`FastifyRequest`, `pg.Pool`, etc.) directly.
- **MUST** contain: use cases (one file per use case), application services, application error types.
- **MUST** receive all infrastructure dependencies via constructor injection or function parameters typed as port interfaces.
- **SHOULD** orchestrate domain calls and port calls, but contain no business rules itself — business rules belong in domain.

```ts
// ✓ application — depends on domain + port interface, not on pg directly
import type { ThreadRepository } from '../ports/thread-repository.js';
import { nextPhase } from '../domain/phase.js';

export async function advancePhase(
  threadId: string,
  repo: ThreadRepository,      // port interface — injected, not imported from infra
): Promise<Result<Thread, AppError>> {
  const thread = await repo.findById(threadId);
  if (!thread.ok) return thread;
  const phase = nextPhase(thread.value.phase);
  if (!phase.ok) return err({ kind: 'invalid_transition', ...phase });
  return repo.save({ ...thread.value, phase: phase.value });
}
```

## Ports (`src/ports/`)

- **MUST** define ports as TypeScript interfaces, not classes.
- **MUST** be owned by the application layer — defined to satisfy what the application needs, not what the infrastructure provides.
- **MUST NOT** leak infrastructure types into port signatures (`pg.QueryResult`, `fastify.RouteOptions`, etc.).
- **SHOULD** name ports after their role, not their implementation: `ThreadRepository`, not `PostgresThreadRepository`.

```ts
// ✓ port — interface defined by application needs
export interface ThreadRepository {
  findById(id: string): Promise<Result<Thread, DbError>>;
  save(thread: Thread): Promise<Result<Thread, DbError>>;
  listActive(): Promise<Result<Thread[], DbError>>;
}
```

## Infrastructure layer (`src/infrastructure/`)

- **MUST** implement ports and only expose implementations through their port interface.
- **MUST** contain: DB adapters, HTTP clients, file system readers, child_process wrappers, Fastify route registrations.
- **MUST** be the only layer that imports `pg`, `fastify`, `child_process`, `fs`, external SDKs.
- **MUST** catch all exceptions from external calls and convert them to `Result` before returning to application code (see result-pattern specialist).
- **SHOULD** keep infrastructure implementations thin — no business logic, only translation between the external world and the port contract.

```ts
// ✓ infrastructure — implements port, imports pg, catches exceptions
import type { ThreadRepository } from '../../ports/thread-repository.js';
import type { Pool } from 'pg';

export class PgThreadRepository implements ThreadRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Result<Thread, DbError>> {
    try {
      const { rows } = await this.pool.query(
        'SELECT id, phase, status FROM threads WHERE id = $1',
        [id],
      );
      return rows.length ? ok(toThread(rows[0])) : err({ kind: 'not_found', id });
    } catch (e) {
      return err({ kind: 'db_error', cause: e });
    }
  }
}
```

## Dependency injection / composition root

- **MUST** wire dependencies (inject infrastructure implementations into application use cases) in a single composition root — typically `src/infrastructure/container.ts` or at server startup.
- **MUST NOT** call `new PgThreadRepository()` from inside application or domain code. Construction happens at the composition root only.
- **SHOULD** pass port implementations as function arguments or constructor parameters — avoid service locators and global registries.

## Route handlers

Route handlers live in infrastructure. They:
1. Parse and validate HTTP input
2. Call an application use case, passing port implementations
3. Map the `Result` to an HTTP response

They contain no business logic and no domain imports beyond types.

## How to detect violations — Critical

When reviewing code during sdd-apply or sdd-audit, flag:

1. **Domain importing infrastructure**: any `import` in `src/domain/` that references `src/infrastructure/`, `pg`, `fastify`, `child_process`, `fs`, or any external package
2. **Application importing infrastructure**: any `import` in `src/application/` that references `src/infrastructure/` or framework packages
3. **Infrastructure bypassed**: application code instantiating `PgThreadRepository` or any concrete infrastructure class directly
4. **Port leaking framework types**: a port interface signature containing `pg.Pool`, `FastifyReply`, or similar
5. **Business logic in infrastructure**: conditional branching or domain rules inside a repository implementation
6. **No port interface**: application code calling `pool.query(...)` directly instead of through a `Repository` port
