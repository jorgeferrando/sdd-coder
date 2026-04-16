---
name: sdd-apply
description: SDD Apply - Implement the change following tasks.md. One task = one file = one atomic commit. Usage - /sdd-apply or /sdd-apply {change-name} or /sdd-apply T03.
requires: ["openspec/changes/{change}/tasks.md", "openspec/steering/conventions.md"]
produces: []
---

# SDD Apply

> Implement the code following `tasks.md`. One task = one file = one atomic commit.

## Usage

```
/sdd-apply                 # Implement active change
/sdd-apply {change-name}   # Implement specific change
/sdd-apply T03             # Continue from a specific task
```

## Prerequisites

- `tasks.md` approved with task list
- Correct git branch created
- `openspec/steering/conventions.md` must exist (run `/sdd-init` first if missing)

## Step 0: Bootstrap verification + load steering

**Verify bootstrap:**

```bash
ls openspec/steering/conventions.md
```

If missing:
```
⚠️  openspec/steering/conventions.md not found.

Run /sdd-init first to set up your project context.
This ensures the AI assistant has the conventions and rules needed to implement correctly.
```
**STOP** — do not proceed without conventions.md.

**Load steering silently** (no output to user unless something relevant is found):

- If `openspec/steering/project-skill.md` exists → read it (it's the index, references the rest)
- Otherwise → read in parallel:
  - `openspec/steering/conventions.md`
  - `openspec/steering/project-rules.md` (if exists)
  - `openspec/steering/tech.md` (if exists)
- Additionally, read **all** other `.md` files in `openspec/steering/` (specialist advisors, domain-specific conventions, etc.). These extend the base conventions with focused expertise.

Apply all rules from these files throughout the implementation.

## Step 1: Load current state

Read `openspec/changes/{change}/tasks.md`. Identify:
- Completed tasks (marked `[x]`)
- Next pending task
- Dependencies between tasks

If `T03` is provided: start from that task.

## Step 2: Verify git state

```bash
git status          # should be clean
git branch --show-current
```

## Step 3: Implement task by task (one agent per task)

For each pending task, launch a **subagent** using the Agent tool. This keeps the orchestrator context clean — implementation details (code read, attempts, test output) stay inside the agent and do not accumulate in the main conversation.

### Agent prompt per task

Spawn one agent per task with this information:

```
Implement task {TASK_ID} for change {change-name}.

TASK: {full task line from tasks.md, including file path and description}
DEPENDS ON: {list of completed task IDs this depends on, or "none"}

STEERING (apply these rules throughout):
- Read openspec/steering/conventions.md
- Read openspec/steering/project-rules.md (if exists)
- Read openspec/steering/tech.md (if exists)

SPEC CONTEXT:
- Read openspec/changes/{change-name}/specs/{domain}/spec.md
- Read openspec/changes/{change-name}/design.md (for architecture context)

INSTRUCTIONS:
1. Read similar existing code in the project to follow established patterns
2. Implement the change described in the task
3. Run the project's test/lint commands on the changed file
4. Fix any issues until quality checks pass
5. Commit atomically:
   git add {specific file}
   git commit -m "[{change-name}] {Description in English, imperative}"
6. Return ONLY a summary: what was done, file(s) touched, commit hash, test result (pass/fail)

RULES:
- Max 70 characters on the first line of the commit message
- Imperative mood: "Add", "Fix", "Update" (not "Added", "Fixes")
- Only commit the file(s) for this task (atomic)
- If something unexpected comes up that is NOT covered by the task description, DO NOT make a unilateral decision — return the problem description and options instead of implementing
```

### After each agent returns

The agent returns a short summary. The orchestrator:

**a) Checks the result.** If the agent reports an unexpected situation, present it to the user with options (see Step 5).

**b) Updates tasks.md.** Mark task as completed:
```
- [x] **T02** ...
```

**c) Reports progress and confirms.**
```
T02 completed ✓  ({one-line summary from agent})
Commits: 2/5
Continue with T03?
```

Wait for user confirmation before launching the next agent, unless the user specified `/sdd-apply --auto` — in auto mode, proceed to the next task immediately after a successful completion (no confirmation needed). If an agent reports an unexpected situation, always pause and ask regardless of mode. Do not batch multiple tasks into a single agent — one task, one agent, one commit.

## Step 4: Changes requested during apply

If the user asks for a change not in `tasks.md`:

**BEFORE implementing:**

1. Add it to `tasks.md` as `BUGxx` or `IMPxx`:
   ```markdown
   ## Bugs found during apply

   - [ ] **BUG01** `path/file` — short symptom description
     - Fix: {description}
     - Commit: `[{change-name}] Fix {description}`
   ```
2. Implement it
3. Commit atomically
4. Mark as `[x]`

**Never implement an unregistered change.** The `tasks.md` is the project timeline.

## Step 5: Unexpected situations

**Do NOT make unilateral decisions.** If something not covered by tasks.md appears:

```
During T03 I found {situation}.
The tasks don't cover this case. How should I proceed?
1. {Option A}
2. {Option B}
3. Stop and update design/tasks
```

## Step 6: Summary when done

```
APPLY COMPLETE: {change-name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tasks completed: N/N
Commits: N
Files created: [list]
Files modified: [list]

Next: /sdd-verify
```

## Next Step

With implementation complete → `/sdd-verify` for tests and quality gates.
