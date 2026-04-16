---
name: sdd-continue
description: SDD Continue - Detect the next pending phase and execute it. Equivalent to "what's next?". Usage - /sdd-continue or /sdd-continue {change-name}.
requires: ["openspec/changes/"]
produces: []
---

# SDD Continue

> Automatically detect the next pending phase and execute the corresponding skill.

## Usage

```
/sdd-continue                  # Active change (only one in openspec/changes/)
/sdd-continue {change-name}    # Specific change
```

## Step 1: Identify the active change

```bash
ls openspec/changes/
```

- If `{change-name}` was provided: use that directory
- If exactly one change exists (excluding `archive/`): use that one
- If multiple: ask the user which one with `AskUserQuestion`

## Step 2: Detect pending phase

Read `openspec/changes/{change-name}/` and determine the first incomplete phase:

| Phase | DONE condition |
|-------|----------------|
| `propose` | `proposal.md` exists |
| `spec` | `specs/*/spec.md` — at least one file exists |
| `design` | `design.md` exists |
| `tasks` | `tasks.md` exists |
| `apply` | `tasks.md` has no `[ ]` remaining |
| `verify` | apply DONE + clean working tree (`git status --porcelain` empty) |

The **first NOT DONE phase** is the one to execute.

### Special cases

- `apply` in progress: if some `[x]` and some `[ ]` → continue apply from first `[ ]`
- `verify` pending only because of dirty git: inform user before running verify
- All phases DONE: inform → ready for `/sdd-archive`

## Step 3: Execute the skill

| Detected phase | Skill to run | Execution mode |
|---------------|--------------|----------------|
| `propose` | `sdd-propose` | **inline** (interactive — asks user questions) |
| `spec` | `sdd-spec` | **inline** (interactive — clarifies edge cases with user) |
| `design` | `sdd-design` | **agent** (non-interactive — reads files, produces design.md) |
| `tasks` | `sdd-tasks` | **inline** (interactive — user validates order) |
| `apply` | `sdd-apply` (with next task ID if partial) | **inline** (apply manages its own per-task agents) |
| `verify` | `sdd-verify` | **agent** (non-interactive — runs checks, creates PR) |
| all DONE | Inform → `/sdd-archive` | — |

### Inline execution

For interactive phases (propose, spec, tasks, apply): follow the skill instructions directly in the current conversation. The user needs to answer questions and provide feedback.

### Agent execution

For non-interactive phases (design, verify): launch the skill as a **subagent** using the Agent tool. This keeps the orchestrator context clean — the code analysis, test output, and check details stay inside the agent.

**Agent prompt template:**
```
Execute sdd-{phase} for change "{change-name}" at openspec/changes/{change-name}/.
Follow the instructions in the sdd-{phase} skill exactly.
Read all required input files (proposal.md, specs, design.md, steering files) as specified.
Return a concise summary of what was produced and any issues found.
```

When the agent returns, present its summary to the user. If the agent reports issues, discuss them before continuing.

### Always announce

```
Detected phase: DESIGN
Change: {change-name}
Running sdd-design (as agent — context stays clean)...
```

## Custom skills (extension point)

If `openspec/skills/` exists, scan it for custom skill files (`*.md` with YAML frontmatter). Custom skills extend the phase table in Step 2.

Each custom skill file must have:
```yaml
---
name: custom-skill-name
description: What it does
requires: ["openspec/changes/{change}/tasks.md"]  # when to trigger
produces: ["openspec/changes/{change}/custom-output.md"]
after: apply    # insert after this built-in phase
mode: inline    # or agent
---
```

**How custom phases work:**
1. Read all `openspec/skills/*.md` files
2. For each, check the `after` field to determine where it fits in the phase sequence
3. Add it to the phase detection table: DONE when `produces` artifacts exist
4. Execute using the `mode` field (inline or agent)

Custom skills run **between** the built-in phase they follow and the next built-in phase. Multiple custom skills with the same `after` value run in alphabetical order.

If a custom skill's `requires` artifacts don't exist yet, skip it (it's not ready).

## Notes

- Never skip phases — if `design.md` is missing, don't run `sdd-tasks` even if proposal and spec exist
- If `tasks.md` has partial completions, pass the next task ID to `sdd-apply` (e.g. `T03`, `BUG01`)
