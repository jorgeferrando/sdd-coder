---
name: sdd-explore
description: SDD Explore - Read-only codebase exploration to understand context before proposing changes. Used as part of /sdd-new or /sdd-continue. Usage - /sdd-explore "what to look for".
requires: ["openspec/config.yaml"]
produces: ["openspec/changes/{change}/notes.md"]
---

# SDD Explore

> Read-only exploration of the codebase to understand context before proposing changes.

## Usage

```
/sdd-explore "what to look for"
/sdd-explore                     # General exploration for the active change
```

## Step 1: Recall past decisions

Before exploring the codebase, search project history for relevant context. Scan `openspec/INDEX.md`, `openspec/specs/`, and `openspec/changes/archive/` for:

- **Previous specs** in the same domain — canonical or archived
- **Design decisions** that explain why something was built a certain way
- **Proposals** that addressed a similar problem (including discarded alternatives)

If matches are found, include them in the output under "Prior decisions". If no archived changes or specs exist (new project), skip this step silently.

## What to look for

- **Prior decisions** — what was already decided in this domain (from Step 1)
- **Similar patterns** — existing implementations of the same type of change
- **Affected files** — what will need to change and why
- **Domain models** — data structures, interfaces, contracts involved
- **Tests** — how existing tests are structured for similar code
- **Specs** — check `openspec/INDEX.md` first (if it exists) to identify relevant domains,
  then load only those spec files from `openspec/specs/`

## Output

Write findings to `openspec/changes/{change-name}/notes.md` so downstream skills (especially `sdd-propose`) can reference them across sessions:

```markdown
# Exploration Notes: {change-name}

## Prior Decisions
- {domain}: {decision from archived spec/design — why it matters for this change}
- {domain}: {discarded alternative — avoid repeating}

## Relevant Files
- `src/...` — {reason}
- `src/...` — {reason}

## Existing Patterns
- Pattern X used in Y — can follow the same approach

## Relevant Specs
- `openspec/specs/{domain}/spec.md` — {why relevant}

## Key Constraints
- {anything that affects the design}
```

Also show a concise summary to the user:

```
EXPLORE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Notes written to: openspec/changes/{change-name}/notes.md

Prior decisions:
  - {domain}: {key decision or discarded alternative}

Relevant files:
  - src/...   (reason)
  - src/...   (reason)

Existing patterns:
  - Pattern X used in Y — can follow the same approach

OpenSpec Index (if present):
  - openspec/INDEX.md → identified domains: {domain1}, {domain2}
  - Loaded specs: openspec/specs/{domain}/spec.md

Key constraints:
  - {anything that affects the design}
```

## OpenSpec Index Lookup

If `openspec/INDEX.md` exists, read it **before** loading any individual spec file:
1. Match the change description / ticket keywords against the `**Keywords:**` field of each entry
2. Load only the 1-3 most relevant domain spec files
3. If no clear match, load the most likely domain + `core`
4. If `openspec/INDEX.md` does not exist, scan `openspec/specs/` directly (fallback)

## Notes

- This is a read-only phase — no code changes
- Keep exploration focused; stop when you have enough context to propose
