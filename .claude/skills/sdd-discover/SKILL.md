---
name: sdd-discover
description: SDD Discover - Analyze existing codebase and generate initial canonical specs in openspec/specs/ with Status inferred. Run once per project after sdd-init. Usage - /sdd-discover or /sdd-discover {domain}.
requires: ["openspec/config.yaml"]
produces: ["openspec/specs/*/spec.md", "openspec/INDEX.md"]
---

# SDD Discover

> Reverse-spec: analyze the existing codebase and infer initial canonical specs.
> Each detected domain is analyzed in an isolated subagent with its own context.

## Usage

```
/sdd-discover              # Analyze entire project
/sdd-discover {domain}     # Analyze a specific domain only
```

Typically invoked after `/sdd-init` when `openspec/specs/` is empty.

## Prerequisites

- `sdd-init` executed (`openspec/` exists with `config.yaml`)
- Project skills loaded

## Step 1: Detect Domains

Explore the project structure to infer architectural domains:

```bash
# Common source roots
ls src/ app/ lib/ packages/ 2>/dev/null

# Count source files per candidate directory
find src app lib packages -maxdepth 1 -type d 2>/dev/null
find . -maxdepth 2 -name "*.py" -o -name "*.ts" -o -name "*.php" \
       -o -name "*.rb" -o -name "*.go" -o -name "*.rs" 2>/dev/null | head -50
```

**Inference rules:**

| Directory found | Inferred domain |
|----------------|----------------|
| `src/{name}/` or `app/{name}/` | `{name}` |
| `tests/`, `spec/`, `__tests__/`, `test/` | `tests` |
| `.py/.ts/.php` files at project root | `{project name}` or `root` |

**Always ignore:** `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`,
`__pycache__/`, `.venv/`, `coverage/`, `openspec/`, `.claude/`, `.cursor/`, `.github/copilot-instructions.md`.

If `{domain}` is provided as an argument, skip auto-detection and analyze only that domain.

## Step 2: Interactive Summary

Before proceeding, show the list of detected domains and ask for confirmation:

```
Detected domains:
  - core      (src/core/  — 12 .py files)
  - tui       (src/tui/   — 9 .py files)
  - tests     (tests/     — 28 .py files)

Proceed with analysis? [Y/n]
```

If the user answers N or cancels → stop without creating any files.

**Domains to skip:** if `openspec/specs/{domain}/spec.md` already exists, indicate it:
```
  - core      → spec already exists, will be skipped
```

If all domains already have specs → inform and finish without creating anything.

## Step 3: Per-Domain Analysis (Parallel Subagents)

After user confirmation, launch **one subagent per domain in parallel**
using the Agent tool (subagent_type: `general-purpose`).

**Base prompt for each subagent:**

```
You are a code analyzer. Your task is to generate a canonical spec for the
"{domain}" domain of the project at {domain_path}.

INSTRUCTIONS:
1. Use Glob and Read to explore the domain files.
   Read what you need to understand the purpose and main entities
   (prioritize: entry points, models, public interfaces).
2. Infer: domain purpose, key entities, main behavior.
3. Generate the file openspec/specs/{domain}/spec.md following EXACTLY
   this canonical format:

---
# Spec: {Domain} — {Descriptive Title}

## Metadata
- **Domain:** {domain}
- **Change:** sdd-discover
- **Date:** {current date}
- **Version:** 1.0
- **Status:** inferred

## Context
{2-4 lines: what problem this domain solves in the system}

## Current Behavior
{Description of what the code implements today, based on what was read}

## Requirements (EARS)
{5-10 REQs inferred from observed behavior}
- **REQ-01** `[Ubiquitous]` The {actor} SHALL {invariant}
- **REQ-02** `[Event]` When {trigger}, the {actor} SHALL {response}
...

<!-- inferred — validate with /sdd-spec -->

## Decisions Made
| Decision | Discarded Alternative | Reason |
|----------|----------------------|--------|
{decisions observed in the code, if any}

## Open / Pending
- [ ] {Aspects of the domain that were unclear during analysis}

> Spec generated automatically by /sdd-discover. Validate and complete with /sdd-spec.
---

4. Write the file with the Write tool.
5. Return only: "✓ {domain} — spec written to openspec/specs/{domain}/spec.md"
```

The orchestrator receives only the confirmation message from each subagent
(not the spec content), keeping the orchestrator context lightweight.

## Step 4: Update openspec/INDEX.md

After receiving confirmation from all subagents:

**If `openspec/INDEX.md` exists:**
- Add an entry for each newly generated domain
- DO NOT modify existing entries

**If `openspec/INDEX.md` does not exist:**
- Create it with a standard header + one entry per generated domain

Entry format (standard INDEX.md):
```markdown
## {domain} (`specs/{domain}/spec.md`)
{1-2 line description of the domain}
**Entities:** {main entities}
**Keywords:** {relevant keywords}
```

## Step 5: Final Summary

```
sdd-discover complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Specs generated (Status: inferred):
  ✓ core    → openspec/specs/core/spec.md
  ✓ tui     → openspec/specs/tui/spec.md
  ✓ tests   → openspec/specs/tests/spec.md
Skipped: —

Next steps:
  Review each spec directly in openspec/specs/{domain}/spec.md
  Edit inferred specs to correct any inaccuracies
  When a domain needs changes later, /sdd-new will create a delta spec via /sdd-spec
```

## Rules

- **Idempotent:** domains with an existing spec are always skipped, no error.
- **Read-only on source code:** only writes to `openspec/`.
- **Does not create an active change:** operates directly on `openspec/specs/`.
- **`Status: inferred`** is the explicit signal that the spec is an automatic draft
  — not a human-validated spec.
- If `openspec/steering/structure.md` exists, the subagent MAY read it to
  improve inference, but it is not required.
