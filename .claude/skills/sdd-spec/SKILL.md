---
name: sdd-spec
description: SDD Spec - Create or update domain specs in openspec/. The spec describes system behavior, not implementation. Usage - /sdd-spec or as part of /sdd-ff.
requires: ["openspec/changes/{change}/proposal.md"]
produces: ["openspec/changes/{change}/specs/*/spec.md"]
---

# SDD Spec

> Create the behavior spec for the change. Describes *what* the system does, not *how*.

## Usage

```
/sdd-spec                  # Spec for the active change
/sdd-spec {change-name}    # Spec for a specific change
```

## Prerequisites

- `proposal.md` created and reviewed

## Step 1: Read proposal and identify the domain

Read `openspec/changes/{change-name}/proposal.md` to understand the problem, scope, and proposed solution. From the proposal, determine the domain/bounded context affected. Check if a canonical spec already exists in `openspec/specs/{domain}/spec.md`.

```bash
mkdir -p openspec/changes/{change-name}/specs/{domain}
```

## Step 2: Read existing specs

If `openspec/specs/{domain}/spec.md` exists, read it first. The change spec is a **delta** — only document what changes.

## Step 3: Clarify behavior

Use `AskUserQuestion` to resolve edge cases, validation rules, and error behavior before writing.

## Step 4: Create the delta spec

Create `openspec/changes/{change-name}/specs/{domain}/spec.md`:

```markdown
# Spec: {Domain} — {Change Title}

## Metadata
- **Domain:** {domain}
- **Change:** {change-name}
- **Date:** {YYYY-MM-DD}
- **Status:** approved

## Expected Behavior

### Main Case

**Given** {context/precondition}
**When** {action/event}
**Then** {expected result}

### Alternative Cases

| Scenario | Condition | Result |
|----------|-----------|--------|
| {scenario} | {condition} | {result} |

### Errors

| Error | When | Response |
|-------|------|----------|
| {error} | {condition} | {code/message} |

## Business Rules

- **BR-01:** {Verifiable rule}

## Decisions Made

| Decision | Alternative discarded | Reason |
|---------|-----------------------|--------|
| {decision} | {alternative} | {reason} |

## Open / Pending

- [ ] {Unresolved question}
```

## Step 5: Present to user

Show the spec. Confirm all behaviors are correctly described. Apply feedback.

## Next Step

With spec approved → `/sdd-continue` (runs `sdd-design`).
