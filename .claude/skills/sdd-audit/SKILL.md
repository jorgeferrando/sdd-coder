---
name: sdd-audit
description: SDD Audit - Analyzes the codebase against conventions.md and project-rules.md, producing a classified report with correction prompts. Usage - /sdd-audit or /sdd-audit src/path/.
requires: ["openspec/steering/conventions.md"]
produces: []
---

# SDD Audit

> Detects architecture violations before PR review.
> Analyzes modified files against conventions in `openspec/steering/conventions.md`
> and implementation rules in `openspec/steering/project-rules.md`.

## Usage

```
/sdd-audit                  # Analyze files modified in current branch
/sdd-audit src/components/  # Analyze a specific directory or file
```

## Prerequisites

- `openspec/steering/conventions.md` must exist
- If missing: run `/sdd-steer` (existing project) or `/sdd-init` (new project) first

## Step 1: Verify prerequisites

```bash
ls openspec/steering/conventions.md
```

If missing:
```
⚠️  openspec/steering/conventions.md not found.

Run /sdd-init to set up your project context first.
Without a conventions baseline, audit has no reference.
```
**STOP** — do not continue without conventions.md.

## Step 2: Load ruleset

Read all steering files as a unified ruleset:

1. Read `openspec/steering/conventions.md` (required)
2. If `openspec/steering/project-rules.md` exists → read it too
3. Read **all** other `.md` files in `openspec/steering/` — specialist advisors add domain-specific rules in the same RFC 2119 format

All rules are treated equally regardless of source file.

**Note:** Rules in `project-rules.md` that duplicate linter coverage (e.g. quote style
already enforced by ruff/eslint) should NOT generate audit violations — the audit is
semantic, not syntactic.

## Step 3: Determine analysis scope

**No argument:**
```bash
git diff --name-only $(git merge-base HEAD main 2>/dev/null || echo "HEAD~10") HEAD
```
Use files modified since the branch diverged from base.

**With path argument:**
Use files at the provided path.

Show scope before analyzing:
```
Analyzing: 4 modified files since main
  src/components/UserCard.tsx
  src/services/user.service.ts
  tests/user.service.spec.ts
  ...
Ruleset: conventions.md (12 rules) + project-rules.md (8 rules) = 20 rules
```

If scope > 20 files: ask user if they want to limit the analysis.

## Step 4: Analyze each file

For each file in scope:
1. Read the file
2. Check each MUST/MUST NOT rule from the relevant area
3. Note violations with approximate line and concrete description

Classification:
- **Critical**: violates `MUST` or `MUST NOT` — typically flagged in PR review
- **Important**: violates `SHOULD` — accumulating technical debt
- **Minor**: violates `MAY` — stylistic or preference

Source of each violation (conventions.md vs project-rules.md) is shown for context.

## Step 5: Generate report

```
## Audit Report — {project} — {date}
Scope: {N files analyzed} | Rules checked: {N} (conventions: {N} + project-rules: {N})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Critical (blocks PR review)

- [C01] `{path/file.ts}:{approx line}` — {concrete description of violation}
  - Rule: {area} — MUST {rule} [{source: conventions.md}]
  - Fix: {what to change exactly}

- [C02] `{path/file.ts}:{approx line}` — {description}
  - Rule: {area} — MUST NOT {rule} [{source: project-rules.md}]
  - Fix: {what to change}

### Important (technical debt)

- [I01] `{path/file.ts}:{approx line}` — {description}
  - Rule: {area} — SHOULD {rule} [{source}]
  - Fix: {what to change}

### Minor

- [M01] `{path/file.ts}:{approx line}` — {description}
  - Rule: {area} — MAY {rule} [{source}]
  - Fix: {what to change}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Summary

| Level | Count |
|-------|-------|
| Critical | {N} |
| Important | {N} |
| Minor | {N} |
| Total | {N} |

## SDD Actions

{Only if there are criticals or importants:}

To fix critical violations:
/sdd-new "fix: {grouped description — one line max}"

{If multiple areas of technical debt:}
For {area} debt:
/sdd-new "refactor: {description}"
```

If no violations:
```
✓ No violations found — conventions upheld.
  {N files analyzed}, {N rules checked}
```

## Step 6: Final recommendation

If criticals found:
```
⚠️  {N} critical violations found.
Fix before creating the PR — these are typically flagged in code review.
```

If only important/minor:
```
ℹ️  {N} non-critical issues. Can be deferred by documenting them in tasks.md.
```

---

## Notes

- Audit is **semantic**, not syntactic — complements linters (ruff, eslint, PHPStan), does not replace them.
- Audit does NOT modify code — only reports and suggests prompts.
- `/sdd-new` prompts group violations by domain, not one prompt per violation.
- In `/sdd-verify`: if `conventions.md` exists, run this audit on change files as an additional step (SHOULD, not MUST).
