---
name: sdd-tasks
description: SDD Tasks - Break the design into atomic tasks. One task = one file = one commit. Usage - /sdd-tasks or as part of /sdd-ff.
requires: ["openspec/changes/{change}/design.md"]
produces: ["openspec/changes/{change}/tasks.md"]
---

# SDD Tasks

> Convert the design into an ordered list of atomic tasks. One task = one commit.

## Usage

```
/sdd-tasks                 # Generate tasks for the active change
/sdd-tasks {change-name}   # Tasks for a specific change
```

## Prerequisites

- `design.md` approved

## Step 1: Review design

Read `openspec/changes/{change}/design.md` to extract:
- Complete list of files to create/modify
- Dependencies between files
- Planned tests

## Step 2: Order by dependencies

Rules:
1. **Interfaces and contracts first** — things others depend on
2. **Base files before files that use them**
3. **Tests after (or interleaved with) implementation**
4. **One file per task** (one commit per file)

## Step 3: Check git state

```bash
git status
git branch --show-current
```

Create a feature branch if the project uses branching (check `conventions.md` or `tech.md` for branching strategy). If already on a feature branch or the project commits directly to main, skip branch creation:
```bash
# Only if not already on a feature branch:
git checkout -b {ticket-or-change-name}
```

## Step 4: Create tasks.md

Create `openspec/changes/{change-name}/tasks.md`:

```markdown
# Tasks: {Change Title}

## Metadata
- **Change:** {change-name}
- **Ticket:** {TICKET-ID or N/A}
- **Branch:** {branch-name}
- **Date:** {YYYY-MM-DD}

## Implementation Tasks

- [ ] **T01** Create `{path/to/file}` — {one-line description}
  - Commit: `[{change-name}] {description in English, imperative}`

- [ ] **T02** Modify `{path/to/file}` — {what changes}
  - Commit: `[{change-name}] {description}`
  - Depends on: T01

## Quality Gate

- [ ] **QG** Run tests and quality checks
  - {test command}
  - {lint command if applicable}

## Notes

- {Ordering constraint if any}
- {Known gotcha}
```

## Step 5: Confirm with user

Show the task list. Ask:
- Is the order correct?
- Is any task too large for a single commit?
- Anything missing?

Adjust based on feedback.

## Next Step

With tasks approved → `/sdd-apply` to implement task by task.
