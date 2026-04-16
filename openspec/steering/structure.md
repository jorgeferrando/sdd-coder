# Structure: SDD Coder

## Directory layout

```
sdd-coder/
├── src/
│   ├── server.ts                  # Fastify setup, routes registration, static serving
│   ├── routes/
│   │   └── threads.ts             # REST endpoints: create thread, send message, stream
│   ├── pipeline/
│   │   ├── machine.ts             # Phase enum, transition rules, state types
│   │   ├── runner.ts              # Orchestrator: process a message through the pipeline
│   │   └── phases/
│   │       ├── init.ts            # Bootstrap openspec/, generate steering, install specialists
│   │       ├── intake.ts          # Parse request, detect ambiguity, gather context
│   │       ├── propose.ts         # Generate proposal.md
│   │       ├── spec.ts            # Generate specs/{domain}/spec.md
│   │       ├── design.ts          # Generate design.md
│   │       ├── tasks.ts           # Generate tasks.md
│   │       └── apply.ts           # Implement tasks one by one with git commits
│   ├── skills/
│   │   ├── reader.ts              # Read skill instructions.md from /skills volume
│   │   └── specialists.ts         # List, install, remove specialists
│   ├── context/
│   │   └── gatherer.ts            # Read steering, artifacts, repo structure, git history
│   ├── llm/
│   │   └── claude.ts              # Anthropic SDK wrapper, prompt building, JSON parsing
│   ├── git/
│   │   └── operations.ts          # Branch, commit, status, diff via child_process
│   ├── db/
│   │   ├── connection.ts          # pg Pool setup
│   │   └── queries.ts             # Thread/message CRUD
│   └── types.ts                   # Shared TypeScript types
├── ui/
│   ├── index.html                 # Chat UI shell
│   ├── app.js                     # Vanilla JS: SSE client, message rendering, phase bar
│   └── styles.css                 # Minimal dark theme
├── sql/
│   └── init.sql                   # Schema: threads, messages
├── test/
│   ├── pipeline/
│   │   ├── machine.test.ts
│   │   └── runner.test.ts
│   ├── skills/
│   │   ├── reader.test.ts
│   │   └── specialists.test.ts
│   ├── git/
│   │   └── operations.test.ts
│   └── fixtures/                  # Mock Claude JSON responses per phase
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Layers & responsibilities

| Layer | Directory | Responsibility |
|---|---|---|
| HTTP | `src/routes/` | Receive messages, stream responses. No business logic. |
| Pipeline | `src/pipeline/` | State machine, phase orchestration, transition rules. |
| Phases | `src/pipeline/phases/` | One file per phase. Calls LLM, returns result. No I/O directly. |
| Skills | `src/skills/` | Read skill instructions and specialist files from the `/skills` volume. |
| Context | `src/context/` | Read the target repo: structure, steering, artifacts, git history. |
| LLM | `src/llm/` | Claude API calls, prompt construction, JSON response parsing. |
| Git | `src/git/` | All git/gh operations on the target repo at `/repo`. |
| DB | `src/db/` | Thread and message persistence in Postgres. |
| UI | `ui/` | Static chat interface served by Fastify. No framework, no build step. |

## Standard flow (per message)

```
HTTP POST /api/threads/:id/messages
  → runner.ts: load state, determine phase
  → context/gatherer.ts: read steering + artifacts + repo structure
  → skills/reader.ts: load skill instruction for current phase
  → llm/claude.ts: build prompt, call Claude, parse JSON
  → phase handler: execute actions (write file, git commit, update DB)
  → SSE stream: send response chunks to UI
```

## Volumes (Docker)

- `/repo` — the target repo the agent works on (mounted from `REPO_PATH`)
- `/skills` — the sdd-skills directory (mounted from `SKILLS_PATH`)

All file reads/writes to the target repo go through `/repo`. All skill/specialist reads go through `/skills`.
