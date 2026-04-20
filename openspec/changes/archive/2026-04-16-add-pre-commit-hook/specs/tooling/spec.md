# Spec: Pre-commit Hook — Tooling Domain

**Change:** add-pre-commit-hook
**Domain:** tooling
**Date:** 2026-04-16

---

## Behavior

### Given a fresh `npm install`

**When** `npm install` completes
**Then** `.git/hooks/pre-commit` exists and is executable

---

### Given no `src/` files (empty project)

**When** `git commit` is run
**Then** the pre-commit hook runs `npm run check`, exits 0, and the commit proceeds

---

### Given a `src/` file with a Biome violation (`any`)

```ts
// src/example.ts
const x: any = 42;
```

**When** `git commit` is run
**Then** the pre-commit hook runs `npm run check`, Biome reports a violation, the hook exits non-zero, and the commit is aborted

---

### Given all `src/` files are Biome-clean

**When** `git commit` is run
**Then** the pre-commit hook exits 0 and the commit proceeds normally

---

### Given a developer needs to bypass the hook

**When** `git commit --no-verify` is run
**Then** the hook is skipped and the commit proceeds regardless

---

## Business rules

1. **BR-01** The hook runs automatically on every `git commit` — no manual step required after `npm install`.
2. **BR-02** The hook command is `npm run check` — same command a developer runs manually.
3. **BR-03** Hook installation is reproducible: `npm install` on any fresh clone installs the hook via `postinstall`/`prepare`.
4. **BR-04** The hook must not introduce a new config file — config lives in `package.json` only.
5. **BR-05** `--no-verify` remains available as an escape hatch for WIP commits.

---

## Edge cases

- **`src/` does not exist**: `npm run check` uses `--no-errors-on-unmatched` — exits 0, hook passes.
- **Windows Git Bash**: `simple-git-hooks` writes a POSIX shell script that Git for Windows executes via `sh.exe`.
- **Hook already exists**: `simple-git-hooks` overwrites `.git/hooks/pre-commit` on each `npm install`.
- **CI environment**: `prepare` runs on `npm install` in CI too — acceptable, the hook is a no-op in CI since no `git commit` is run by the build.
