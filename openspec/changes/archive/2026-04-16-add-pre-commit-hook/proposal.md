# Proposal: Add Pre-commit Hook

**Change:** add-pre-commit-hook
**Date:** 2026-04-16
**Status:** approved

---

## Context

Biome 1.9.4 is installed (`add-biome-linting`) with `npm run check` (lint + format write). Running it is currently manual. Nothing stops a developer from committing code that fails Biome checks.

## Problem

Without an automated gate, lint violations and formatting drift accumulate between manual runs. In a solo project this means the first time `npm run check` is run before a PR it may surface many violations at once rather than catching them per commit.

## Scope

- Install a pre-commit hook that runs `npm run check` before every `git commit`
- Hook must be reproducible: any fresh clone gets the hook automatically after `npm install`
- Hook must be fast enough not to annoy on small commits (Biome on `src/` is <1s with no files)

Out of scope: pre-push hooks, commit-message linting, staged-only linting (lint-staged).

## Proposed Solution

Use `simple-git-hooks` — a minimal devDependency (no sub-dependencies, <1KB) that reads hook commands from `package.json` and installs them via a `postinstall` script. Zero config files beyond `package.json`.

Add to `package.json`:
- `devDependency`: `"simple-git-hooks": "latest"`
- `simple-git-hooks` key: `{ "pre-commit": "npm run check" }`
- `scripts.prepare`: `"simple-git-hooks"` (runs on `npm install`, installs the hook)

After `npm install`, `.git/hooks/pre-commit` is created automatically.

## Alternatives Discarded

| Alternative | Reason discarded |
|---|---|
| Husky | Heavier, requires `.husky/` directory, more config surface |
| Manual `scripts/install-hooks.sh` | Requires running manually — new clones don't get the hook automatically |
| lefthook | Binary dependency, overkill for a single hook |
| lint-staged | Extra dependency; we want to check the full `src/` not just staged files — the codebase is small |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Hook blocks commit on legitimate WIP (no `src/` yet) | `--no-errors-on-unmatched` already in `npm run check` — exits 0 with no files |
| Developer bypasses with `--no-verify` | Acceptable escape hatch; convention is to not use it without a reason |
| Windows compatibility | `simple-git-hooks` writes POSIX shell scripts; Git for Windows runs them via `sh.exe` which is included |

## Impact

- `package.json` — 1 devDependency, 1 new script (`prepare`), 1 new `simple-git-hooks` config key
- `.git/hooks/pre-commit` — created automatically by postinstall (not committed — git ignores `.git/`)
- No source files affected

## Dependencies

Requires `add-biome-linting` change (already archived). `npm run check` must exist.

## Acceptance Criteria

- [ ] `npm install` succeeds with `simple-git-hooks` installed
- [ ] `.git/hooks/pre-commit` exists after `npm install`
- [ ] `git commit` with no `src/` files runs the hook and exits 0
- [ ] A TypeScript file with `any` in `src/` causes `git commit` to abort
- [ ] `package.json` has `prepare` script and `simple-git-hooks` config key
