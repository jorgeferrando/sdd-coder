---
name: sdd-verify
description: SDD Verify - Final validation before PR. Run tests, quality checks, and self-review checklist. Usage - /sdd-verify or /sdd-verify {change-name}.
requires: ["openspec/changes/{change}/tasks.md"]
produces: []
---

# SDD Verify

> Final validation before creating the PR. Tests + quality checks + self-review.

## Usage

```
/sdd-verify                # Verify active change
/sdd-verify {change-name}  # Verify specific change
```

## Prerequisites

- `/sdd-apply` completed (all tasks in tasks.md marked `[x]`)

## Step 1: Identify changed files

```bash
git diff --name-only main..HEAD    # or dev..HEAD depending on your base branch
```

## Step 2: Run tests

Check `openspec/steering/tech.md` for the project's test command. Run the full test suite:
```bash
# Use whatever your project uses:
pytest
npm test
go test ./...
./gradlew test
```

All tests must pass before proceeding. If no test command is configured in `tech.md` and no test runner is detected, skip this step and note it in the final report as `Tests: SKIPPED (no test runner configured)`.

## Step 3: Quality checks

Check `openspec/steering/tech.md` for configured linters/formatters. Run them on changed files:
```bash
# Examples:
ruff check src/
eslint src/
golangci-lint run
```

Fix any issues, re-run, and commit the fix atomically. If no linter is configured in `tech.md` and none is detected in the project, skip this step and note it in the final report as `Quality: SKIPPED (no linter configured)`. Do not install new tools during verify.

## Step 4: Self-review checklist

Review the changed code against these criteria:

### 1. Tests exist for new code
- [ ] New functions/methods have tests
- [ ] Edge cases are covered
- [ ] Error paths are tested

### 2. Input validated before processing
- [ ] Required fields checked
- [ ] Types/formats validated at system boundaries
- [ ] No raw user input passed to internal logic unvalidated

### 3. Methods are small and focused
- [ ] No method > 50 lines
- [ ] Nesting depth < 3 levels
- [ ] One responsibility per method

### 4. No hardcoded values
- [ ] Magic numbers extracted to constants
- [ ] Status/type strings use enums or constants
- [ ] No environment-specific values in source code

### 5. No code duplication
- [ ] Similar logic extracted to shared methods
- [ ] Consistent patterns with the existing codebase

### 6. Type hints / type safety
- [ ] All method parameters typed
- [ ] All return types declared
- [ ] Nullable types explicit

### 7. Null / None checks
- [ ] Results checked before use
- [ ] Optional parameters handled
- [ ] Exceptions raised for unexpected nulls

### 8. Spec compliance
- [ ] All spec cases covered
- [ ] Input/output contracts match
- [ ] Business rules implemented
- [ ] Error messages match spec

## Step 5: Smoke test (for UI/TUI projects)

If the project has a UI, run it manually and verify the changed behavior end-to-end.

If a bug is found during smoke test:
1. Document it as `BUGxx` in `tasks.md` before fixing
2. Fix and commit atomically
3. Re-run smoke test until it passes

## Step 6: Convention audit (if available)

If `openspec/steering/conventions.md` exists, run `sdd-audit` on the files changed in this branch as an additional quality gate. Include the audit result in the final report.

If audit finds critical violations, fix them before proceeding (same flow as Step 3: fix, commit, re-run).

## Step 7: Final report

```
VERIFY REPORT: {change-name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tests:    N/N PASS
Quality:  PASS
Self-review: ✓
Spec compliance: ✓
Audit:   ✓ (N rules checked, 0 violations)

Status: READY FOR PR
```

## Step 8: Create PR

Create the pull request for the change:

```bash
git push -u origin {branch-name}
```

Then create the PR using the project's tooling (e.g. `gh pr create`). Use `proposal.md` context for the PR title and body:
- **Title:** short summary from the proposal
- **Body:** Problem, Proposed Solution, and Acceptance Criteria sections from `proposal.md`

Show the PR URL to the user for review.

## Next Step

PR created and reviewed → `/sdd-archive` to close the change.
