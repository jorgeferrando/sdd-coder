---
name: sdd-init
description: SDD Init - Bootstrap openspec/ with guided onboarding. Scans environment, asks questions about the project (with trade-offs), and generates openspec/steering/ artifacts that feed the entire SDD workflow. Entry point for new projects. Usage - /sdd-init.
requires: []
produces: ["openspec/config.yaml", "openspec/steering/product.md", "openspec/steering/tech.md", "openspec/steering/structure.md", "openspec/steering/conventions.md", "openspec/steering/environment.md", "openspec/steering/project-skill.md", "openspec/steering/project-rules.md"]
---

# SDD Init

> Entry point for the SDD workflow. Bootstraps `openspec/` and runs guided onboarding
> to generate the project context that feeds `sdd-apply`, `sdd-audit`, and the rest of the workflow.

## Usage

```
/sdd-init
```

Safe to re-run: if steering already exists, shows current state instead of re-running onboarding.

---

## Step 1: Skills check

Check whether the core SDD skills are installed:

Check if SDD skill files are accessible in the current environment.

If missing:
```
⚠️  SDD skills not installed.

To install, run one of:
  bash install-skills.sh --global   # from the sdd-skills repo
  curl -fsSL https://raw.githubusercontent.com/jorgeferrando/sdd-skills/main/install-skills.sh | bash

Continuing with openspec/ setup — you can install skills afterwards.
```

Do not block — continue with the rest of init.

## Step 2: Create openspec/ structure

```bash
mkdir -p openspec/specs
mkdir -p openspec/changes/archive
mkdir -p openspec/steering
```

Exclude from git unless the project intentionally commits openspec/:
```bash
grep -q "openspec/" .git/info/exclude 2>/dev/null || echo "openspec/" >> .git/info/exclude
```

## Step 3: Detect project state

Run environment scan. The script may be in different locations depending on how skills were installed:
```bash
# Try common locations — use whichever resolves
bash sdd-env-scan.sh 2>/dev/null ||
bash scripts/sdd-env-scan.sh 2>/dev/null ||
bash ~/.claude/skills/sdd-init/sdd-env-scan.sh 2>/dev/null ||
bash .claude/skills/sdd-init/sdd-env-scan.sh 2>/dev/null
```

If the scan script is not found, detect the environment manually by checking for common files (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.) and runtimes (`node --version`, `python3 --version`, etc.). Do not block on a missing scan script.

Parse the output to determine:
- **Stack detected**: which runtimes and config files are present
- **Has code**: `src/`, `lib/`, `app/` or equivalent exists
- **Steering exists**: `openspec/steering/conventions.md` present
- **MCPs available**: containers named `mcp-*` in Docker output

**If `openspec/steering/` already has content** (conventions.md exists):
```
SDD INIT — Project already bootstrapped
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Steering found: openspec/steering/
  ✓ conventions.md
  ✓ project-rules.md  (or ✗ missing)
  ✓ tech.md           (or ✗ missing)
  ...

To update conventions: /sdd-steer sync
To start a new feature: /sdd-new "description"
```
**STOP** — skip Steps 4-6, go to Step 7.

## Step 4: Questionnaire

**Mode**:
- **quick** — if the user ran `/sdd-init --quick` or the project is small (< 5 source files): ask only Groups A and B, skip C/D/E. Use sensible defaults: solo developer, production quality, conventional commits, no CI, AI decides architecture and TDD per task.
- **reduced** — stack detected from config files: skip Group B (already known).
- **full** — no code detected, no `--quick` flag: ask all groups.

Present questions one group at a time. Wait for answers before proceeding.

### Principles
- Assume the user has no technical knowledge
- For each decision with multiple valid options: show trade-offs in plain language
- When the AI has high confidence for the given context: recommend explicitly with a one-line justification
- The user can always answer "you decide" — the AI will choose and explain

---

### Group A — Project (always asked)

**A1. What does this project build?**
(Free text, 1-3 sentences. Example: "A web app where users can book parking spaces.")

**A2. Who uses it?**
(Examples: end users via browser, mobile app, internal team, other APIs, etc.)

**A3. What does it NOT do?**
(Helps define boundaries. Example: "It doesn't handle payments — that's a separate system.")

---

### Group B — Stack (skip if detected from config files)

**B1. What type of project is it?**

| Option | Best for |
|--------|---------|
| Web app (frontend) | UI that users interact with in a browser |
| API / Backend | Service that other apps consume |
| CLI tool | Command-line utility |
| Mobile app | iOS/Android |
| Library / Package | Code other developers use |
| Full-stack | Frontend + backend together |

**B2. Preferred language?**

If user has no preference, recommend based on B1:
- Web frontend → JavaScript/TypeScript *(most ecosystem, most jobs, runs in browser natively)*
- API/Backend → TypeScript (Node) or Python *(TS: fast, typed; Python: simpler syntax, great for data/AI)*
- CLI → Python or Go *(Python: easy to write; Go: single binary, fast)*
- Library → match the language of the target ecosystem

**B3. Framework?**

Show top 2-3 options for the chosen language with one-line trade-offs. Example for TypeScript API:
- **Express** — minimal, flexible, you decide everything *(more work, more control)*
- **Fastify** — like Express but faster and with built-in schema validation *(recommended for APIs)*
- **NestJS** — structured, opinionated, like Angular for backends *(best for large teams)*

**B4. Database?** (if applicable)
- **None** — stateless, uses external APIs
- **PostgreSQL** — relational, robust, recommended default for most apps
- **SQLite** — file-based, zero setup, good for small/local apps
- **MongoDB** — document-based, flexible schema *(best when data structure varies a lot)*
- **Redis** — in-memory, for cache or real-time features

**B5. Testing stack?**
Usually determined by the main framework — confirm or ask if ambiguous.

---

### Group C — Team & rigor (always asked)

**C1. Team size?**
- Solo developer
- Small team (2-5 people)
- Larger team (6+)

**C2. Quality level?**
- **MVP / Prototype** — move fast, some shortcuts OK, will refactor later
- **Production** — proper tests, documented conventions, code review
- **Open source** — public repo, contributor-friendly, strict conventions

**C3. CI/CD?**
- None for now
- GitHub Actions
- GitLab CI
- Other

---

### Group D — Available tools (only if MCPs detected in scan)

Show which MCPs were detected, confirm which to use for this project:

```
Detected available tools:
  ✓ Context7    — library documentation (recommended: yes)
  ✓ Jira/Linear — ticket tracking (use for this project?)
  ✓ GitHub      — PR integration (recommended: yes)
```

---

### Group E — Patterns (optional, recommend based on stack)

**E1. Architecture style?**
If user says "you decide", recommend based on stack and team size:
- Solo/MVP → simple layered (no ceremony)
- Small team/Production → hexagonal or clean architecture
- API + large team → CQRS

**E2. TDD?**
- Yes — write tests before code *(slower start, fewer regressions)*
- No — write tests after *(faster to start, discipline required)*
- AI decides per task *(recommended: TDD for critical logic, tests-after for UI)*

**E3. Commit format?**
- Conventional Commits (`feat: add user auth`) *(tooling compatible, changelog-friendly)*
- `[change-name] Description` *(SDD default — simple, traceable)*
- Other

---

## Step 5: Generate openspec/steering/

With all answers collected, generate 7 files in parallel:

### `product.md`
```markdown
# Product: {project name}

## What it builds
{1-2 paragraphs from A1}

## For whom
{from A2}

## Bounded context (what it does NOT do)
{from A3}
```

### `tech.md`
```markdown
# Tech Stack: {project}

## Language & runtime
- {language} {detected version}
- {framework} {version if known}

## Key dependencies
- {dep}: {purpose}

## Tools
- Tests: {framework}
- Linting: {tool}
- Package manager: {tool}

## Environments
- Dev: {how to start}
- Test: {how to run tests}

## Documentation references
{If Context7 available: resolve library IDs and add links}
- {library}: context7_id={id}
```

### `structure.md`
```markdown
# Structure: {project}

## Directory layout
{proposed structure based on stack and architecture choice}

## Layers & responsibilities

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| {layer} | `{path}` | {what it does / does NOT do} |

## Standard flow
{ASCII diagram or description of a typical request/operation}
```

### `conventions.md`
```markdown
# Conventions: {project}

> Rules that cause PR review failures. RFC 2119 levels: MUST / MUST NOT / SHOULD / MAY.
> Source of truth for /sdd-audit.

## Bootstrap decisions
{Decisions made during /sdd-init onboarding:}
- Architecture: {chosen style} — {justification}
- Testing: {TDD/after} — {justification}
- Commit format: {format} — {justification}

## {Stack area} — {sub-area}
- **MUST** {concrete rule} — {one-line reason}
- **MUST NOT** {concrete rule} — {one-line reason}
- **SHOULD** {concrete rule} — {one-line reason}
```

Derive conventions from the chosen stack's known best practices.
Example areas: Language imports, Framework patterns, Testing, Git, Architecture layers.

### `environment.md`
```markdown
# Environment: {project}

## Available MCPs
{From scan — confirmed by user in Group D:}
- context7: {available/not available}
- atlassian/linear: {available/not available}
- github: {available/not available}

## CLI tools
- git: {version}
- gh: {available/missing}
- docker: {available/missing}
- {package manager}: {version}

## Runtimes
- {runtime}: {version}

## Docker containers (if any)
{List from scan}

## Notes
{Any environment-specific setup notes}
```

### `project-skill.md`
```markdown
---
name: {project-name}
description: Project context for {project name}. Load at session start when working on this project.
---

# {Project Name} — Project Context

> Load this file at the start of any session working on this project.
> It references the steering files that define conventions, rules, and stack decisions.

## Quick reference

- **Stack**: {language} + {framework}
- **Architecture**: {style}
- **Tests**: {framework}, {TDD/after}
- **Commits**: {format}

## Steering files (read before implementing)

- `openspec/steering/conventions.md` — architectural rules (MUST/SHOULD/MAY)
- `openspec/steering/project-rules.md` — granular implementation rules (grows with project)
- `openspec/steering/tech.md` — stack details and dependency references
- `openspec/steering/structure.md` — directory layout and layer responsibilities

## Living rules

When the user corrects a decision the AI made during implementation:
- The AI asks: "Want me to save this as a rule in project-rules.md for the future?"
- On confirmation (or explicit "remember this"): add to project-rules.md in RFC 2119 format
- On second correction of the same thing: save without asking

See `project-rules.md` for accumulated rules.
```

### `project-rules.md`
```markdown
# Project Rules: {project}

> Granular implementation rules that grow as the project evolves.
> Updated when the user corrects AI decisions.
> Read by /sdd-apply and /sdd-audit alongside conventions.md.

## Style

{empty — populated as project evolves}

## Tests

{empty — populated as project evolves}

## Architecture

{empty — populated as project evolves}
```

---

### Context7 integration (if available)

If `mcp__context7` is available and the stack has recognized libraries:
```
Resolve library IDs for detected dependencies and add to tech.md.
```
Do not block or error if Context7 is unavailable or unresponsive.

---

## Step 6: Write openspec/config.yaml

```yaml
# openspec/config.yaml
project: {name}
created_at: {date}

paths:
  specs: openspec/specs
  changes: openspec/changes
  archive: openspec/changes/archive
  steering: openspec/steering

steering:
  project_skill: openspec/steering/project-skill.md

environment:
  mcps: {list from scan}
  tools: {list from scan}
```

---

## Step 7: Show completion state

```
SDD INIT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project:  {name}
Stack:    {language} + {framework}

openspec/steering/ generated:
  ✓ product.md
  ✓ tech.md
  ✓ structure.md
  ✓ conventions.md  ({N} rules)
  ✓ environment.md
  ✓ project-skill.md
  ✓ project-rules.md  (empty — grows with the project)

Next steps:
  /sdd-new "description"   → start your first feature
  /sdd-audit               → check existing code against conventions
```

---

## Living rules — how project-rules.md grows

During any session working on this project, when the user corrects a decision the AI made:

**Explicit correction** ("always use X", "from now on Y", "remember this"):
→ Add rule to `project-rules.md` immediately, confirm: "Saved: MUST use X — {reason}"

**Implicit correction** (user overrides something the AI chose):
→ Ask: "Want me to save this as a rule for future sessions? (project-rules.md)"
→ On yes: add rule. On no: apply only in this session.
→ On second implicit correction of the same pattern: save without asking.

**Rule format** (RFC 2119):
```markdown
## {Area}
- **MUST** {concrete rule} — {one-line reason from the correction context}
```

**Classification**:
- Granular implementation (style, naming, test patterns, library usage) → `project-rules.md`
- Architectural decisions (layers, patterns, data flow) → `conventions.md`

---

## Notes

- `openspec/` is local by default — excluded via `.git/info/exclude`
- If your project commits `openspec/` (like sdd-tui itself), skip the exclude step
- `project-skill.md` is the index: keep it under 100 lines — details go in the files it references
- Re-running `/sdd-init` on a project with existing steering shows state and exits — use `/sdd-steer sync` to update
