# SDD — Spec-Driven Development

This project uses the SDD workflow. All changes follow a structured pipeline managed through `/sdd-*` skills and documented in `openspec/`.

## Golden rule

**Never implement without steering.** Before writing code, check that `openspec/steering/conventions.md` exists. If it doesn't, run `/sdd-init` first. Load steering silently at the start of every implementation session.

## Workflow

Every change follows this sequence:

```
propose → spec → design → tasks → apply → verify → archive
```

Use `/sdd-continue` to detect and execute the next pending phase. Use `/sdd-ff "description"` to generate all documentation in one pass for clear-scope changes.

## How to work in this project

### Starting a change

1. Run `/sdd-new "description"` or `/sdd-ff "description"`
2. All artifacts go in `openspec/changes/{change-name}/`
3. Do not create code without a tracked change

### Implementing

1. Read `openspec/steering/conventions.md` and `project-rules.md` before writing any code
2. Follow `tasks.md` task by task — one file per task, one commit per task
3. Commit format: `[{change-name}] Description in imperative mood`
4. Run quality checks (tests, lint) before each commit
5. If something unexpected comes up, stop and ask — no unilateral decisions
6. If unplanned work appears, register it as BUGxx or IMPxx in tasks.md before implementing

### Closing a change

1. `/sdd-verify` — all tests pass, lint clean, self-review checklist
2. `/sdd-archive` — merges delta specs into canonical specs, moves change to archive

## Key directories

```
openspec/
├── steering/          # Project context — READ BEFORE IMPLEMENTING
│   ├── conventions.md #   Rules (MUST/SHOULD/MAY) — hard requirement for /sdd-apply
│   ├── project-rules.md # Learned rules — grows with corrections
│   └── tech.md        #   Stack, tools, commands
├── specs/             # Canonical specs — current system behavior
├── changes/           # Active changes (each with proposal, spec, design, tasks)
└── changes/archive/   # Completed changes
```

## Conventions enforcement

- `conventions.md` uses RFC 2119 levels: **MUST**, **MUST NOT**, **SHOULD**, **MAY**
- MUST/MUST NOT violations block PRs
- When the user corrects a decision, offer to save it as a rule in `project-rules.md`
- On the second correction of the same pattern, save automatically

## Available skills

| Skill | Purpose |
|-------|---------|
| `/sdd-init` | Bootstrap project — generates steering files |
| `/sdd-discover` | Reverse-engineer specs from existing code |
| `/sdd-steer` | Generate or sync steering files |
| `/sdd-new` | Start a new change (explore + propose) |
| `/sdd-ff` | Fast-forward: propose + spec + design + tasks in one pass |
| `/sdd-continue` | Detect and execute next pending phase |
| `/sdd-explore` | Read-only codebase exploration |
| `/sdd-propose` | Create proposal.md |
| `/sdd-spec` | Create behavior spec (delta, not full) |
| `/sdd-design` | Create implementation plan |
| `/sdd-tasks` | Break design into atomic tasks |
| `/sdd-apply` | Implement task by task with atomic commits |
| `/sdd-verify` | Final validation before PR |
| `/sdd-archive` | Close cycle, merge specs, archive change |
| `/sdd-audit` | Check code against conventions |
| `/sdd-docs` | Generate MkDocs documentation from openspec |
