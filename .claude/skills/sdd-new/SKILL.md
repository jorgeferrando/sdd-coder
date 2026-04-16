---
name: sdd-new
description: SDD New - Start a new change. Runs explore + propose in sequence. Entry point for new features. Usage - /sdd-new "description" or /sdd-new TICKET-123.
requires: ["openspec/config.yaml"]
produces: ["openspec/changes/{change}/proposal.md", "openspec/changes/{change}/notes.md"]
---

# SDD New

> Start a new change. Explores the codebase and creates `proposal.md`.

## Usage

```
/sdd-new "description"   # Start from a description
/sdd-new TICKET-123      # Start from a ticket ID
```

## Sequence

1. **Explore** — read relevant code, understand context (`sdd-explore`)
2. **Propose** — create `proposal.md` with problem, solution, and impact (`sdd-propose`)

## Step 1: Choose a change name

Derive a short kebab-case name from the description or ticket:
- `"Add user export"` → `user-export`
- `TICKET-123` → `ticket-123-short-description`

Create the directory:
```bash
mkdir -p openspec/changes/{change-name}
```

## Step 2: Explore

Read the codebase to understand:
- Existing patterns related to the change
- Files that will be affected
- Canonical specs in `openspec/specs/` if any exist

## Step 3: Propose

Run `sdd-propose` to create `openspec/changes/{change-name}/proposal.md`.

## Next Step

With `proposal.md` created → `/sdd-continue` to proceed to spec.
