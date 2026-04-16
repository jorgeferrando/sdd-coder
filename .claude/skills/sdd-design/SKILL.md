---
name: sdd-design
description: SDD Design - Technical design for the change. Translates the behavior spec into an implementation plan with files, classes, patterns, and dependencies. Usage - /sdd-design or as part of /sdd-ff.
requires: ["openspec/changes/{change}/proposal.md", "openspec/changes/{change}/specs/*/spec.md"]
produces: ["openspec/changes/{change}/design.md"]
---

# SDD Design

> Translate the behavior spec into a concrete implementation plan.

## Usage

```
/sdd-design                # Design for the active change
/sdd-design {change-name}  # Design for a specific change
```

## Prerequisites

- `proposal.md` and `specs/{domain}/spec.md` approved

## Step 1: Review context

Read:
1. `openspec/changes/{change}/proposal.md`
2. `openspec/changes/{change}/specs/{domain}/spec.md`
3. Existing code patterns similar to what needs to be built

## Step 2: Scope analysis

List ALL files to create or modify:

```
SCOPE ANALYSIS:
Files to create:
  - src/...

Files to modify:
  - src/...

Total: N files
Result: [Ideal < 10 / Evaluate 10-20 / Split required > 20]
```

If > 20 files → propose splitting the change before continuing.

## Step 3: Create design.md

Create `openspec/changes/{change-name}/design.md`:

```markdown
# Design: {Change Title}

## Metadata
- **Change:** {change-name}
- **Date:** {YYYY-MM-DD}
- **Status:** approved

## Technical Summary

{1-2 paragraphs describing the chosen technical approach}

## Architecture

{ASCII diagram or flow description}

## Files to Create

| File | Type | Purpose |
|------|------|---------|
| `src/...` | {type} | {purpose} |

## Files to Modify

| File | Change | Reason |
|------|--------|--------|
| `src/...` | {what changes} | {why} |

## Scope

- **Total files:** {N}
- **Result:** {Ideal / Evaluate / Split required}

## Design Decisions

| Decision | Alternative | Reason |
|---------|------------|--------|
| {decision} | {alternative} | {reason} |

## Implementation Notes

{Any technical detail the implementer needs to know}
```

## Step 4: Validate with user

Present the design. Confirm:
- Is the technical approach correct?
- Are all affected files identified?
- Any design decisions to revisit?

## Next Step

With design approved → `/sdd-continue` (runs `sdd-tasks`).
