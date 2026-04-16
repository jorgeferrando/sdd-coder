# Structure: SDD Coder

## Directory layout

```
sdd-coder/
├── src/
│   ├── server.ts                        # Composition root: wire deps, start Fastify
│   ├── types/
│   │   └── result.ts                    # Result<T,E>, ok(), err(), map, flatMap, match
│   │
│   ├── domain/                          # Pure business logic. ZERO external imports.
│   │   ├── thread.ts                    # Thread entity, Phase type, status rules
│   │   ├── phase.ts                     # Phase transition rules (pure functions)
│   │   └── errors.ts                    # Domain error discriminated unions
│   │
│   ├── application/                     # Use cases. Imports domain + ports only.
│   │   ├── run-phase.ts                 # Orchestrate one pipeline phase for a thread
│   │   ├── advance-thread.ts            # Transition thread to next phase
│   │   ├── create-thread.ts             # Initialise a new thread
│   │   └── errors.ts                    # Application error discriminated unions
│   │
│   ├── ports/                           # Interfaces owned by application layer
│   │   ├── thread-repository.ts         # CRUD for Thread
│   │   ├── message-repository.ts        # CRUD for Message
│   │   ├── llm-client.ts                # Call LLM, return structured result
│   │   ├── skill-reader.ts              # Read skill/specialist instructions
│   │   ├── context-gatherer.ts          # Read steering, artifacts, repo structure
│   │   └── git-client.ts                # Branch, commit, status, diff
│   │
│   ├── infrastructure/                  # Implements ports. Imports pg, fastify, SDK, fs, etc.
│   │   ├── db/
│   │   │   ├── connection.ts            # pg Pool setup
│   │   │   ├── pg-thread-repository.ts  # implements ThreadRepository
│   │   │   └── pg-message-repository.ts # implements MessageRepository
│   │   ├── llm/
│   │   │   └── claude-client.ts         # implements LlmClient (Anthropic SDK)
│   │   ├── skills/
│   │   │   ├── file-skill-reader.ts     # implements SkillReader (reads /skills volume)
│   │   │   └── specialist-manager.ts    # install/remove specialists in /repo
│   │   ├── context/
│   │   │   └── repo-context-gatherer.ts # implements ContextGatherer (reads /repo)
│   │   ├── git/
│   │   │   └── git-cli-client.ts        # implements GitClient (child_process)
│   │   └── http/
│   │       ├── server.ts                # Fastify instance, plugin registration
│   │       ├── routes/
│   │       │   └── threads.ts           # REST + SSE endpoints (unwrap Result → HTTP)
│   │       └── static.ts                # Serve ui/ directory
│   │
│   └── pipeline/                        # Phase handlers (called by run-phase use case)
│       ├── phases/
│       │   ├── init.ts                  # Bootstrap openspec/, install specialists
│       │   ├── intake.ts                # Parse request, detect ambiguity
│       │   ├── propose.ts               # Generate proposal.md
│       │   ├── spec.ts                  # Generate specs/{domain}/spec.md
│       │   ├── design.ts                # Generate design.md
│       │   ├── tasks.ts                 # Generate tasks.md
│       │   └── apply.ts                 # Implement tasks with atomic commits
│       └── prompt-builder.ts            # Assemble prompts from skill + context
│
├── ui/
│   ├── index.html                       # Chat UI shell
│   ├── app.js                           # SSE client, message rendering, phase bar
│   └── styles.css                       # Minimal dark theme
├── sql/
│   └── init.sql                         # Schema: threads, messages
├── test/
│   ├── domain/                          # Pure unit tests — no mocks needed
│   ├── application/                     # Unit tests — mock ports via test doubles
│   ├── infrastructure/                  # Integration tests — real DB, real FS
│   └── fixtures/                        # Mock Claude JSON responses per phase
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── biome.json
├── .env.example
└── README.md
```

## Layers & responsibilities

| Layer | Directory | Can import from | Responsibility |
|---|---|---|---|
| Domain | `src/domain/` | `src/types/` only | Entities, value objects, phase rules, domain errors. Pure functions, no I/O. |
| Application | `src/application/` | `domain/`, `ports/`, `types/` | Use cases. Orchestrates domain + ports. No framework types. |
| Ports | `src/ports/` | `domain/`, `types/` | TypeScript interfaces that application needs. Implemented by infrastructure. |
| Infrastructure | `src/infrastructure/` | Everything | DB, HTTP, SDK, FS, child_process. Catches exceptions, converts to Result. |
| Pipeline | `src/pipeline/` | `application/`, `ports/`, `types/` | Phase handlers called by run-phase use case. |
| Types | `src/types/` | Nothing | Result<T,E> and other shared primitives. |

**Dependency rule:** `infrastructure → application → domain`. No arrows inward from outer layers.

## Standard flow (per message)

```
HTTP POST /api/threads/:id/messages          (infrastructure/http)
  → threads route: parse input, call use case
  → run-phase (application): load thread, gather context, load skill
  → phase handler (pipeline): build prompt, call LlmClient port
  → claude-client (infrastructure): call Anthropic SDK, parse JSON → Result
  → phase handler: write files via GitClient port, update DB via ThreadRepository
  → Result unwrapped at route: stream response chunks to UI via SSE
```

## Composition root (`src/server.ts`)

The only place that instantiates infrastructure implementations and injects them into use cases:

```ts
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const threads = new PgThreadRepository(pool);
const llm     = new ClaudeClient(process.env.ANTHROPIC_API_KEY);
const git     = new GitCliClient(process.env.REPO_PATH);
// ... inject into use cases, pass to route registration
```

## Volumes (Docker)

- `/repo` — the target repo the agent works on (mounted from `REPO_PATH`)
- `/skills` — the sdd-skills directory (mounted from `SKILLS_PATH`)
