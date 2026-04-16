# SDD Coder — Project Plan

## What is SDD Coder

SDD Coder is the autonomous execution engine for the SDD (Spec-Driven Development) methodology defined in [sdd-skills](https://github.com/jorgeferrando/sdd-skills).

Today, the SDD workflow requires a developer sitting in Claude Code (or Cursor, Codex, Copilot) manually invoking `/sdd-new`, `/sdd-continue`, `/sdd-apply`, etc. SDD Coder removes that manual orchestration. The developer describes what they want, and the agent runs the full cycle: propose → spec → design → tasks → apply.

### Relationship with sdd-skills

| | sdd-skills | SDD Coder |
|---|---|---|
| Is | Methodology (markdown instructions) | Execution engine (service) |
| Execution | Manual (human invokes `/sdd-*`) | Autonomous (service orchestrates) |
| LLM access | Provided by the IDE | Direct via Anthropic API |
| State | Implicit (files in `openspec/`) | Explicit (DB + conversation state) |
| Interface | IDE (Claude Code, Cursor...) | Chat UI (later: Slack, webhooks) |

### Hybrid architecture (Option C)

The **orchestration** (state machine, I/O, git, file operations) is TypeScript code. The **methodology** (what to do in each phase) comes from sdd-skills instructions. Claude receives:

- The skill instruction for the current phase as methodology context
- The project context (steering files, existing artifacts, repo structure)
- A structured output schema (JSON)
- The conversation history

Our code handles everything Claude can't do from an API call: read files, write files, git commit, manage state, serve the UI.

### sdd-skills integration

SDD Coder reads skill instructions and specialist files from sdd-skills at runtime:

- **Skill instructions**: `skills/sdd-{phase}/instructions.md` — used as methodology context in prompts
- **Specialists**: `specialists/{name}/*.md` — domain-specific conventions (security, testing, readability, etc.)
- **Mounted as volume**: `/skills` in Docker, configurable via `SKILLS_PATH` env var

Specialists are `.md` files with RFC 2119 rules (MUST/SHOULD/MAY) that get installed into `openspec/steering/`. Once there, they're indistinguishable from base steering — the context gatherer reads all `openspec/steering/*.md` without special treatment. This means:

1. Installing a specialist = copy its `.md` from `/skills/specialists/{name}/` to `/repo/openspec/steering/`
2. Removing a specialist = delete the file from `openspec/steering/`
3. All active specialists are automatically included in every prompt's context

Available specialists in sdd-skills:

| Specialist | Scope | Severity | What it adds |
|---|---|---|---|
| security | all | Critical | OWASP-aware: injection, auth, secrets, input validation |
| tdd | all | Critical | Test-first: tests before implementation, Red/Green/Refactor |
| testing | all | Important | Test design: proper doubles, behavior-focused, no redundancy |
| anti-overengineering | all | Important | Detects premature abstractions, rule of 3 |
| readability | all | Important | Naming, structure, no abbreviations, max 3 nesting levels |
| performance | all | Critical (N+1) | N+1 queries, pagination, unbounded loads |
| accessibility | frontend | Critical (keyboard) | WCAG, ARIA, semantic HTML, keyboard navigation |

---

## Stack

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js 20 LTS | Developer's primary stack |
| Language | TypeScript 5 (strict) | Type safety, single language across the project |
| HTTP framework | Fastify 5 | Lightweight, good TS support, fast |
| LLM | @anthropic-ai/sdk | Direct API, no framework overhead |
| Database | PostgreSQL 16 | Needed later for pgvector; Docker Compose makes it trivial |
| DB driver | pg (node-postgres) | Simple, no ORM overhead for MVP |
| Testing | Vitest | Fast, native TS, built-in mocking |
| Dev runner | tsx | No build step during development |
| UI | HTML + vanilla JS | No build step, no framework, served by Fastify |
| Containerization | Docker Compose | app + db, nothing else |

### What we're NOT using (and why)

| Technology | Why not |
|---|---|
| Python | Single-language stack preferred. TS ecosystem covers all needs. |
| LangGraph / LangChain | YAGNI. Pipeline is linear with approval gates. Simple state machine suffices. |
| Redis | No queue needed for single-user local. Pipeline runs in-process. |
| React / Vue / Svelte | No build step for UI. Vanilla JS is enough for a chat interface. |
| ORM (Drizzle, Prisma) | Queries are simple. Raw pg is sufficient and transparent. |
| Microservices | Single process. Split when there's a scaling reason, not before. |

---

## Architecture

### IT-0 (MVP local)

```
┌─────────────────────────────────────────────────────┐
│                  Docker Compose                      │
│                                                      │
│  ┌──────────────────────────────────┐  ┌──────────┐ │
│  │         app (Node.js)            │  │   db     │ │
│  │                                  │  │ Postgres │ │
│  │  Fastify                         │  │          │ │
│  │  ├── REST API (/api/*)           │  │ threads  │ │
│  │  ├── SSE (/api/stream)           │  │ messages │ │
│  │  └── Static UI (/)               │  │ artifacts│ │
│  │                                  │  │          │ │
│  │  Pipeline                        │  └──────────┘ │
│  │  ├── State machine               │               │
│  │  ├── Skill reader                │               │
│  │  ├── Context gatherer            │               │
│  │  ├── Claude caller               │               │
│  │  └── Action executor             │               │
│  │      ├── File writer             │               │
│  │      ├── Git operations          │               │
│  │      └── Artifact manager        │               │
│  │                                  │               │
│  │  /repo (mounted volume)          │               │
│  │  /skills (mounted volume)        │               │
│  └──────────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

### First-use flow (init)

When a repo is connected for the first time (no `openspec/` directory), SDD Coder bootstraps it before accepting tasks:

```
User opens chat
        │
        ▼
Check: does openspec/steering/conventions.md exist?
        │
        ├── YES → greet user, ready for tasks
        │
        └── NO → enter init mode
                    │
                    ├── 1. Scan repo (package.json, tsconfig, configs, file tree)
                    ├── 2. Infer what we can: stack, structure, environment
                    ├── 3. Ask 2-3 key questions that can't be inferred:
                    │      - What does this project build and for whom?
                    │      - What is explicitly out of scope?
                    │      - Any hard conventions? (commit format, test policy, etc.)
                    ├── 4. Generate 7 steering files in openspec/steering/
                    ├── 5. Suggest relevant specialists based on detected stack:
                    │      "I detected React + Node.js + PostgreSQL.
                    │       Relevant specialists: security, testing, readability.
                    │       Which ones do you want to activate?"
                    ├── 6. Install selected specialists (copy to openspec/steering/)
                    ├── 7. Commit: "sdd: init openspec for {project}"
                    └── 8. Ready for tasks
```

This uses sdd-init's skill instructions as prompt context, but in "mixed" mode: auto-infer what the code tells us, only ask what it can't.

If the repo already has `openspec/` (user already uses sdd-skills manually), SDD Coder reads the existing steering and works immediately.

### Per-task flow

```
User types message in chat UI
        │
        ▼
POST /api/threads/:id/messages
        │
        ▼
Pipeline.process(threadId, userMessage)
        │
        ├── 1. Load thread state from DB
        ├── 2. Determine current phase
        ├── 3. Read skill instruction for phase
        ├── 4. Gather context:
        │      ├── All steering files (openspec/steering/*.md — includes specialists)
        │      ├── Existing artifacts for this change
        │      ├── Repo file structure
        │      ├── Relevant canonical specs (openspec/specs/)
        │      └── Recent git history
        ├── 5. Build prompt (skill + context + schema)
        ├── 6. Call Claude API
        ├── 7. Parse JSON response
        ├── 8. Execute actions:
        │      ├── Write artifact to openspec/
        │      ├── Git commit
        │      └── Update DB state
        └── 9. Return response to UI via SSE
```

### File structure

```
sdd-coder/
├── src/
│   ├── server.ts                  # Fastify setup, routes, static serving
│   ├── routes/
│   │   └── threads.ts             # REST endpoints for chat
│   ├── pipeline/
│   │   ├── machine.ts             # State machine (phases, transitions)
│   │   ├── runner.ts              # Orchestrator (process a message through pipeline)
│   │   ├── phases/
│   │   │   ├── intake.ts          # Parse request, detect ambiguity
│   │   │   ├── propose.ts         # Generate proposal.md
│   │   │   ├── spec.ts            # Generate spec.md
│   │   │   ├── design.ts          # Generate design.md
│   │   │   ├── tasks.ts           # Generate tasks.md
│   │   │   └── apply.ts           # Implement task by task
│   │   └── prompts.ts             # Prompt construction (skill + context + schema)
│   ├── skills/
│   │   ├── reader.ts              # Read and parse skill instructions from sdd-skills
│   │   └── specialists.ts         # List, install, remove specialists
│   ├── context/
│   │   └── gatherer.ts            # Read repo structure, steering (incl. specialists), artifacts, git history
│   ├── llm/
│   │   └── claude.ts              # Anthropic SDK wrapper, response parsing
│   ├── git/
│   │   └── operations.ts          # Branch, commit, diff (child_process)
│   ├── db/
│   │   ├── connection.ts          # pg pool
│   │   └── queries.ts             # Thread/message/artifact CRUD
│   └── types.ts                   # Shared types
├── ui/
│   ├── index.html                 # Chat UI
│   ├── app.js                     # Vanilla JS client
│   └── styles.css                 # Minimal styles
├── sql/
│   └── init.sql                   # DB schema
├── test/
│   ├── pipeline/
│   │   ├── machine.test.ts        # State transitions
│   │   └── runner.test.ts         # Pipeline orchestration (mocked Claude)
│   ├── skills/
│   │   ├── reader.test.ts         # Skill instruction parsing
│   │   └── specialists.test.ts    # Specialist install/remove/list
│   ├── git/
│   │   └── operations.test.ts     # Git wrapper
│   └── fixtures/                  # Mock Claude responses per phase
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Database schema (IT-0)

```sql
CREATE TABLE threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_name   TEXT,                              -- kebab-case, set after intake
  repo_path     TEXT NOT NULL,                     -- path to mounted repo
  phase         TEXT NOT NULL DEFAULT 'intake',    -- current pipeline phase
  status        TEXT NOT NULL DEFAULT 'active',    -- active | completed | error
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     UUID NOT NULL REFERENCES threads(id),
  role          TEXT NOT NULL,                     -- user | agent | system
  content       TEXT NOT NULL,
  phase         TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',               -- artifact path, commit hash, etc.
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### Prompt structure (hybrid approach)

Each phase call to Claude follows this template:

```
SYSTEM:
You are SDD Agent executing the {PHASE} phase.

## Methodology
{content of skills/sdd-{phase}/instructions.md}

## Output format
Respond ONLY with valid JSON matching this schema:
{
  "message":          string,     // markdown message for the user
  "artifact":         {           // file to write, or null
    "path":           string,     // relative to openspec/changes/{change}/
    "content":        string      // full file content
  } | null,
  "questions":        string[] | null,  // clarifying questions (max 3)
  "awaitingApproval": boolean,          // true if user must approve before next phase
  "phaseComplete":    boolean           // true if ready to advance
}

## Project context
Repository: {repo name}
Change: {change-name}

### Steering (all files from openspec/steering/, including active specialists)
{contents of conventions.md, tech.md, project-rules.md, conventions-security.md, conventions-testing.md, ...}

### File structure
{tree output of repo, limited depth}

### Existing artifacts for this change
{list of files already in openspec/changes/{change}/}

### Relevant canonical specs
{specs from openspec/specs/ that match the affected domain}

MESSAGES:
{conversation history for this thread}
```

---

## Roadmap

```
IT-0  Pipeline local          → the agent works, generates real code
IT-1  GitHub + security       → branches, PRs, secret scan, protected paths
IT-2  Repo context depth      → full codebase awareness, conventions inference
IT-3  CI/CD awareness         → wait for checks, attempt auto-fix on failure
IT-4  Semantic memory         → pgvector, learns from approved PRs
───────────────────────────────────────────────────────────
      USEFUL TOOL FOR A DEVELOPER
───────────────────────────────────────────────────────────
IT-5  Slack intake            → open to non-technical stakeholders
IT-6  Traceability            → GitHub Issues, Jira, linked sub-tasks
IT-7  Multi-domain tasks      → infra + code, dependency graph
───────────────────────────────────────────────────────────
      MONETIZABLE PRODUCT
───────────────────────────────────────────────────────────
IT-8  Dashboard + cost control → observability, spend tracking
IT-9  Billing + onboarding    → Stripe, self-service, free trial
───────────────────────────────────────────────────────────
      SUSTAINABLE PRODUCT
───────────────────────────────────────────────────────────
IT-10 Multi-repo + enterprise
```

### Dependencies

```
IT-0 ──► IT-1 ──► IT-2 ──► IT-3
                    │
                    ▼
                   IT-4
                    │
          ┌────────┴────────┐
          ▼                 ▼
        IT-5              IT-6
          │                 │
          └────────┬────────┘
                   ▼
                  IT-7
                   │
          ┌────────┴────────┐
          ▼                 ▼
        IT-8              IT-9
          │                 │
          └────────┬────────┘
                   ▼
                 IT-10
```

---

## IT-0 — Pipeline local (MVP)

### Objective

A developer runs `docker compose up`, opens the chat, describes a task, and gets real commits in their local repo with the full SDD artifact chain: proposal → spec → design → tasks → implemented code.

### Pipeline phases

| Phase | Skill used | Artifact produced | Approval gate | Runs |
|---|---|---|---|---|
| Init | sdd-init | `openspec/steering/*.md` | Specialists selection | Once per repo |
| Intake | (built-in) | — | No | Per task |
| Propose | sdd-propose | `proposal.md` | Yes | Per task |
| Spec | sdd-spec | `specs/{domain}/spec.md` | Yes | Per task |
| Design | sdd-design | `design.md` | Yes | Per task |
| Tasks | sdd-tasks | `tasks.md` | Yes | Per task |
| Apply | sdd-apply | source code + commits | Per task (or auto) | Per task |

**Init** runs once the first time a repo is connected. It uses mixed mode: auto-infer from code + 2-3 key questions + specialist suggestions. If `openspec/` already exists, init is skipped entirely.

Phases NOT in IT-0: explore (simplified into intake context reading), verify (user does manually), archive (user does manually), PR creation (user does with `gh`).

### Definition of Done

**Infrastructure**
- [ ] `docker compose up` starts app + postgres without errors
- [ ] Only requires `ANTHROPIC_API_KEY`, `REPO_PATH`, `SKILLS_PATH` in `.env`
- [ ] Chat accessible at `http://localhost:3000`
- [ ] Database tables created automatically on first start
- [ ] Repo mounted as volume at `/repo`, skills at `/skills`
- [ ] Git credentials from host available inside container

**Chat UI**
- [ ] User can type a message, send with Enter
- [ ] Shift+Enter for newline
- [ ] User and agent messages visually distinct
- [ ] Phase bar shows current phase (including init)
- [ ] Typing indicator while agent processes
- [ ] Artifact panel opens when a `.md` file is generated
- [ ] Git commits shown inline
- [ ] "Awaiting approval" indicator when agent waits
- [ ] Error messages shown clearly (not stack traces)

**Pipeline: Init (first use)**
- [ ] On first connection, detects `openspec/` missing and enters init mode
- [ ] Reads repo structure, configs (package.json, tsconfig, etc.), recent commits
- [ ] Auto-infers: stack, structure, environment
- [ ] Asks 2-3 key questions: what it builds, for whom, boundaries, hard conventions
- [ ] Generates 7 steering files in `openspec/steering/`
- [ ] Lists available specialists relevant to detected stack
- [ ] User selects which specialists to activate
- [ ] Installs selected specialists (copies .md to `openspec/steering/`)
- [ ] Commits all steering files: `sdd: init openspec for {project}`
- [ ] If `openspec/` already exists, skips init and greets user
- [ ] User can install/remove specialists later via chat commands

**Pipeline: Intake**
- [ ] Agent reads user message and determines if it's clear enough
- [ ] If ambiguous, asks max 3 clarifying questions
- [ ] If clear, advances to Propose
- [ ] Agent reads repo file structure and last 20 commits for context

**Pipeline: Propose**
- [ ] Agent generates `proposal.md` following sdd-propose format
- [ ] Artifact written to `openspec/changes/{change}/proposal.md`
- [ ] Committed to repo: `sdd: add proposal for {change}`
- [ ] Agent shows proposal in chat, waits for approval
- [ ] User can request changes before approving
- [ ] Does not advance to Spec without explicit approval

**Pipeline: Spec**
- [ ] Agent generates `specs/{domain}/spec.md` following sdd-spec format
- [ ] Delta against canonical spec if it exists
- [ ] Uses Given/When/Then for behavior definitions
- [ ] Committed to repo: `sdd: add spec for {change}`
- [ ] Waits for approval before advancing

**Pipeline: Design**
- [ ] Agent generates `design.md` following sdd-design format
- [ ] Includes files to create/modify table, scope assessment, design decisions
- [ ] Committed to repo: `sdd: add design for {change}`
- [ ] Waits for approval before advancing

**Pipeline: Tasks**
- [ ] Agent generates `tasks.md` following sdd-tasks format
- [ ] Tasks are atomic: one task = one file = one commit
- [ ] Dependency order respected
- [ ] Committed to repo: `sdd: add tasks for {change}`
- [ ] Waits for approval before advancing

**Pipeline: Apply**
- [ ] Agent implements tasks one at a time
- [ ] Each task produces at least one commit
- [ ] Commits follow format: `[{change-name}] description`
- [ ] Agent works on branch `sdd/{change-name}`, never on `main`
- [ ] Agent asks before continuing to next task (or continues if user says "auto")
- [ ] If stuck, stops and asks rather than guessing
- [ ] After all tasks, notifies in chat

**Persistence**
- [ ] Conversation state survives container restart
- [ ] Phase progress survives container restart
- [ ] Multiple threads don't interfere

**Security**
- [ ] Agent never commits to `main`
- [ ] `ANTHROPIC_API_KEY` never appears in commits or logs
- [ ] `.env*` files never modified by agent

**Quality**
- [ ] Artifacts are coherent with each other (proposal → spec → design → tasks → code)
- [ ] Agent doesn't invent libraries or patterns not present in the repo
- [ ] Generated code references real files from the repo

### Test strategy

**Unit tests (Vitest, mocked Claude)**
- State machine transitions (including init → intake → propose → ... → apply)
- Skill reader parsing
- Specialist manager (list available, install, remove, detect installed)
- Git operations wrapper
- Prompt construction (verify steering + specialists included in context)
- Response JSON parsing
- Error handling

**Integration tests (Vitest, Claude Haiku)**
- Init phase generates valid steering files
- Each per-task phase produces valid JSON
- Each per-task phase produces correctly formatted artifacts
- Phase transitions work end-to-end
- Specialist rules affect apply phase output

**Manual E2E (Claude Sonnet)**
- Full pipeline run on a real repo
- Output quality validation

### Estimated cost

| Activity | Claude calls | Cost |
|---|---|---|
| Dev day (unit tests + integration) | ~50 | ~$0.05 |
| Dev week | ~300 | ~$0.30 |
| IT-0 complete (~6 weeks) | ~2,000 | ~$2 |
| One full pipeline run (Sonnet) | ~8-12 | ~$0.50 |

---

## IT-1 — GitHub + Security

### Objective
The agent creates branches and PRs in remote repos. Basic security measures in place.

### Features
- GitHub App or `gh` CLI for repo access
- Branch creation: `sdd/{change-name}` (never `main`)
- Auto PR creation with structured description (sdd-agent step 9)
- Secret scanning before each commit
- Protected paths config (`sdd-coder.config.yml`)
- Audit log in Postgres

### Success criteria
Agent completes a task on a GitHub repo and opens a PR without manual intervention.

---

## IT-2 — Repo context depth

### Objective
The agent deeply understands the codebase and generates code that matches existing patterns.

### Features
- Full codebase scan (sdd-explore workflow)
- Steering file awareness (reads `conventions.md`, `tech.md`, etc.)
- sdd-recall: searches archived specs and past decisions
- Context window management (only send relevant context, not everything)
- Convention inference from code when steering files don't exist

### Success criteria
On a repo the agent has never seen, it generates code that follows existing naming conventions, file structure, and patterns without being told.

---

## IT-3 — CI/CD awareness

### Objective
The agent reacts to CI results and attempts to fix failures.

### Features
- Wait for GitHub Actions checks after push
- Read CI error logs
- Attempt auto-fix (max N retries)
- Distinguish agent errors from environment errors (flaky tests, infra issues)
- `/sdd-verify` integration (test suite, linting, self-review checklist)
- Retry with exponential backoff on API failures

### Success criteria
Agent fixes a CI failure without human intervention in 80% of cases.

---

## IT-4 — Semantic memory

### Objective
The agent improves with use. Build the defensible moat.

### Features
- pgvector extension in Postgres
- Embeddings via Voyage AI
- Auto-extract learnings from approved PRs
- Repo memory: conventions, patterns, decisions
- Confidence decay for stale memories
- Semantic retrieval: context per phase capped at ~2,500 tokens

### Success criteria
After 3 months of use, the agent asks 40% fewer clarifying questions and proposals match team style without manual correction.

---

## IT-5 — Slack intake

### Objective
Non-technical stakeholders can launch tasks from Slack.

### Features
- Bolt.js for Slack integration
- Natural language intake
- Clarification in-thread (max 3 questions)
- `/sdd status`, `/sdd pause`, `/sdd cancel` commands
- Permission model by role

### Success criteria
A product manager launches a task from Slack without opening GitHub.

---

## IT-6 — Traceability

### Objective
Every task is a traceable artifact linked across all tools.

### Features
- Auto-create GitHub Issue from proposal
- Sub-issues per task
- Jira integration (optional)
- Auto-close issues on merge
- Links in Slack with status updates

### Success criteria
A Slack-initiated task generates a Jira epic, GitHub issues, and linked PRs without human intervention.

---

## IT-7 — Multi-domain tasks

### Objective
Handle features that span infrastructure and code.

### Features
- Task classification: `infra` / `code`
- Dependency graph between tasks
- Separate PRs per domain
- Configurable autonomy level per domain

### Success criteria
A feature touching Redis + backend + frontend decomposes and executes in the correct order.

---

## IT-8 — Dashboard + cost control

### Objective
The client sees what the agent is doing and controls spend.

### Features
- Web dashboard: active tasks, history, token usage
- Audit log browser
- Proactive notifications near budget limits
- Weekly summary

### Success criteria
The user answers "how much did I spend this month?" in under 10 seconds.

---

## IT-9 — Billing + onboarding

### Objective
Self-service revenue without manual intervention.

### Features
- Stripe with metering per completed task
- Guided onboarding: GitHub App → Slack → config → first task in <10 min
- Free trial (first 10 tasks)
- Transactional emails (Resend)

### Success criteria
A stranger installs, completes a task, and pays without talking to anyone.

---

## IT-10 — Multi-repo + Enterprise

### Features
- Monorepo workspace detection
- Cross-repo epics with coordinated PRs
- Zero data retention (Anthropic enterprise)
- On-premise option (Llama via Ollama)
- SSO (SAML/OIDC)
- Exportable audit log

---

## Open decisions

These don't need answers right now but will come up:

1. **sdd-skills versioning**: pin to a specific commit/tag, or always use latest?
2. **Streaming**: SSE for real-time responses, or poll? (SSE recommended)
3. **Multi-thread UI**: support multiple active changes simultaneously?
4. **Auto mode**: let user say "auto" to skip all approval gates (like sdd-agent's confidence model)?
5. **Openspec commit strategy**: commit to the working branch, or to a separate openspec branch?
