---
name: sdd-steer
description: SDD Steer - Generate and synchronize steering files in openspec/steering/. Bootstrap on first run, sync detects drift, report analyzes health. Usage - /sdd-steer or /sdd-steer sync or /sdd-steer report.
requires: ["openspec/steering/"]
produces: ["openspec/steering/conventions.md", "openspec/steering/project-rules.md", "openspec/steering/tech.md", "openspec/steering/structure.md", "openspec/steering/product.md"]
---

# SDD Steer

> Generate "persistent memory" files for the project in `openspec/steering/`.
> Captures invisible conventions that cause PR review failures — final, readonly, naming, layers.

## Usage

```
/sdd-steer          # Bootstrap: generate all files from scratch
/sdd-steer sync     # Sync: detect drift and propose updates
/sdd-steer report   # Report: analyze steering health and coverage
```

## Prerequisites

- Architecture and code-quality skills for the project loaded (or load them now)
- Be in the project root directory

## Bootstrap Mode (`/sdd-steer`)

### Step 1: Detect project and load skills

Detect the project from the working directory. Load in parallel:
- `{project}-architecture`
- `{project}-code-quality`

If already loaded, continue directly.

If `openspec/steering/` already has content:
```
⚠️  openspec/steering/ already has content.
Use `/sdd-steer sync` to update instead of overwriting.
Continue anyway? (y/n)
```
Wait for confirmation before continuing.

### Step 2: Explore codebase (read-only)

Explore in parallel:
- Directory structure: `ls -la src/` (or project equivalent)
- Config files: `pyproject.toml`, `composer.json`, `package.json`, etc.
- 2-3 representative files from each layer (handlers, controllers, entities, components)
- Project memory files if available (e.g., `MEMORY.md` or tool-specific memory)
- `openspec/specs/` to understand the documented domain

### Step 3: Generate `openspec/steering/product.md`

```markdown
# Product: {Project Name}

## What it builds
{1-2 paragraphs: purpose, domain, value}

## For whom
{users/systems that consume it}

## Bounded context
{system boundaries — what it does NOT do}
```

### Step 4: Generate `openspec/steering/tech.md`

```markdown
# Tech Stack: {Project}

## Language and runtime
- {language} {version}
- {main runtime / framework} {version}

## Key dependencies
- {dep}: {purpose}

## Tools
- Tests: {framework}
- Linting: {tool}
- Build: {tool}

## Environments
- Dev: {how to start}
- Test: {how to run tests}
```

### Step 5: Generate `openspec/steering/structure.md`

```markdown
# Structure: {Project}

## Code organization

{description of each main directory and what it contains}

## Layers and responsibilities

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| {layer} | `{path}` | {what it does, what it does NOT do} |

## Standard request/operation flow

{ASCII diagram or description of the typical flow}
```

### Step 6: Generate `openspec/steering/conventions.md`

This is the most valuable file. Derive conventions from three sources (in priority order):

1. **Architecture/code-quality skills** — most reliable source
2. **Project MEMORY.md** — patterns discovered in previous sessions
3. **Existing code** — empirical evidence (naming, structure, decorators)

Format:

```markdown
# Conventions: {Project}

> Rules that cause PR review failures. RFC 2119 levels: MUST / MUST NOT / SHOULD / MAY.

## {Area} — {Sub-area}

- **MUST** {concrete rule} — {one-line reason}
- **MUST NOT** {concrete rule} — {one-line reason}
- **SHOULD** {concrete rule} — {one-line reason}
```

Common area examples:

**Python / Textual:**
```markdown
## Python — Imports
- **MUST** use `from __future__ import annotations` in all modules — forward refs

## Textual — Navigation
- **MUST** use `push_screen` / `pop_screen` — no inline widget swap
- **MUST** use `call_after_refresh` for dynamic height — Textual render order
- **MUST NOT** use `pilot.type()` in tests — does not exist in Textual 8.x; use `widget.value = text`

## Workers
- **MUST** use `@work(thread=True, exclusive=True)` for blocking subprocess workers
- **MUST** use `self.app.call_from_thread` (not `self.call_from_thread`) — Screen doesn't expose it

## Commits
- **MUST** follow format `[change-name] Description in English`
- **MUST** be atomic: one logical change, one file per commit
```

**PHP / Symfony / CQRS:**
```markdown
## PHP — Classes
- **MUST** use `final` keyword — inheritance not used by convention
- **MUST** declare all Request properties as `readonly` — immutability contract

## CQRS — Handlers
- **MUST NOT** inject Repository directly — only via use case interfaces
- **MUST** receive a single Command/Query object as parameter

## Naming
- **MUST** name Commands as `{Verb}{Entity}Command` (e.g. CreateRateCommand)
- **MUST** name Handlers as `{Verb}{Entity}Handler` (e.g. CreateRateHandler)
```

### Step 7: Create directory and write files

```bash
mkdir -p openspec/steering/
```

Write the four files. Show summary when done:

```
STEER COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files generated:
  openspec/steering/product.md
  openspec/steering/tech.md
  openspec/steering/structure.md
  openspec/steering/conventions.md ← {N} conventions documented

Next: /sdd-audit to verify the current codebase against these conventions.
```

---

## Sync Mode (`/sdd-steer sync`)

### Step 1: Read current state

Read in parallel:
- `openspec/steering/conventions.md` (existing)
- Architecture/code-quality skills for the project
- Project MEMORY.md

### Step 2: Detect drift

Compare:
- Are there conventions in the skills that are not in `conventions.md`?
- Are there conventions in `conventions.md` that no longer reflect the current code?
- Have new patterns appeared in recent commits/MEMORY.md?

### Step 3: Propose changes

Present specific proposals to the user. **DO NOT apply automatically.**

Format:
```
DRIFT DETECTED in conventions.md:

ADD (new conventions found):
+ ## Angular — Signals
+   - **MUST** use `signal()` for reactive state — no BehaviorSubject

UPDATE (outdated convention):
~ ## Tests — Patterns
~   OLD: **MUST NOT** use `async/await` directly
~   NEW: **MUST** use `async/await` with `asyncio` mode in pytest.ini

REMOVE (no longer applies):
- ## Python — Compat
-   - **MUST** support Python 3.9 (no longer required — min is 3.13)

Apply these changes? (y/n/select)
```

---

## Report mode (`/sdd-steer report`)

Analyze the current state of steering files and produce a health report. Read-only — no files are modified.

### What to analyze

1. **`conventions.md`** — count rules by level (MUST/SHOULD/MAY) and by area (section headers)
2. **`project-rules.md`** — count rules added by user correction vs. bootstrap
3. **Archived changes** — scan `openspec/changes/archive/` to count how many changes were completed
4. **Drift indicators** — check if `tech.md` references tools/versions that no longer match the project (e.g., package.json has different versions)

### Output format

```
STEERING REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Conventions (conventions.md):
  MUST:   12 rules across 4 areas
  SHOULD: 6 rules across 3 areas
  MAY:    2 rules

Project rules (project-rules.md):
  Total:  5 rules
  Style:  2 | Tests: 1 | Architecture: 2

History:
  Archived changes: 8
  Domains with canonical specs: 3

Health:
  ✓ conventions.md — up to date
  ⚠ tech.md — Node version mismatch (file: 18, detected: 22)
  ✓ structure.md — matches current layout
  ✗ project-rules.md — empty sections (Style, Tests)

Suggestions:
  - Run /sdd-steer sync to update tech.md
  - Consider adding rules to empty sections after next code review
```

## Notes

- `openspec/steering/` can be committed or in `.git/info/exclude` — project decision.
- Steering does not replace architecture skills — it complements them with evidence from the actual code.
- Update `conventions.md` after each `/sdd-archive` if new conventions were discovered.
