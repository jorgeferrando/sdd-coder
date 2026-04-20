# Spec: Tooling

**Domain:** tooling
**Version:** 1.1
**Date:** 2026-04-16
**Sources:** add-biome-linting, add-pre-commit-hook

---

## Behavior

### Biome lint and format

#### Given a fresh clone with no src/ files

**When** `npm run lint` is executed
**Then** Biome exits 0 (no files to check = no errors, `--no-errors-on-unmatched`)

**When** `npm run fmt` is executed
**Then** Biome exits 0 (no files to format)

**When** `npm run check` is executed
**Then** Biome exits 0 (lint + format, no files)

---

#### Given a TypeScript file that uses `any`

```ts
// src/example.ts
const x: any = 42;
```

**When** `npm run lint` is executed
**Then** Biome reports a `noExplicitAny` lint error and exits non-zero

---

#### Given a TypeScript file with inconsistent formatting

```ts
// src/example.ts — 4-space indent, double-quote strings
function foo()  {
    const x = "hello"
    return x
}
```

**When** `npm run fmt` is executed
**Then** Biome rewrites the file with 2-space indent, single-quote strings, and normalised whitespace

---

#### Given `biome.json` is present

**When** `npx biome check --config-path biome.json` is executed
**Then** Biome exits 0 (config is valid and parseable)

---

### Pre-commit hook

#### Given a fresh `npm install`

**When** `npm install` completes
**Then** `.git/hooks/pre-commit` exists and is executable

---

#### Given no `src/` files

**When** `git commit` is run
**Then** the pre-commit hook runs `npm run check`, exits 0, and the commit proceeds

---

#### Given a `src/` file with a Biome violation (`any`)

**When** `git commit` is run
**Then** the pre-commit hook runs `npm run check`, Biome reports a violation, the hook exits non-zero, and the commit is aborted

---

#### Given all `src/` files are Biome-clean

**When** `git commit` is run
**Then** the pre-commit hook exits 0 and the commit proceeds normally

---

#### Given a developer needs to bypass the hook

**When** `git commit --no-verify` is run (or `SKIP_SIMPLE_GIT_HOOKS=1 git commit`)
**Then** the hook is skipped and the commit proceeds regardless

---

## Business rules

### Biome
1. **BR-01** Biome is the single lint + format authority. No ESLint, no Prettier.
2. **BR-02** `noExplicitAny` rule is enabled — enforces the `conventions.md` TypeScript MUST.
3. **BR-03** `organizeImports` is enabled — import order is automatic, not manual.
4. **BR-04** Line width = 100 characters. Indent = 2 spaces. Quotes = single.
5. **BR-05** `lint` script is read-only (check only). `fmt` writes. `check` writes + lint together.
6. **BR-06** Scripts target `src/` only. Test files excluded from `--write` scope; widen in a follow-up change.

### Pre-commit hook
7. **BR-07** The hook runs automatically on every `git commit` — no manual step required after `npm install`.
8. **BR-08** The hook command is `npm run check` — same command a developer runs manually.
9. **BR-09** Hook installation is reproducible: `npm install` or `npm ci` on any fresh clone installs the hook via `prepare`.
10. **BR-10** Hook config lives in `package.json` only — no extra config files.
11. **BR-11** `--no-verify` and `SKIP_SIMPLE_GIT_HOOKS=1` remain available as escape hatches.

---

## Configuration

### Biome
- Tool: Biome 1.9.4 (`@biomejs/biome` pinned, not `latest`)
- Config file: `biome.json` at project root
- Rules: `recommended: true` + `noExplicitAny: "error"` + `useConst: "error"` + `noVar: "error"`
- Ignored paths: `node_modules`, `dist`, `coverage`, `openspec`, `*.json`, `*.jsx`, `*.md`

### Pre-commit hook
- Tool: `simple-git-hooks` (latest, no sub-dependencies)
- Config: `"simple-git-hooks": { "pre-commit": "npm run check" }` in `package.json`
- Installed via: `"prepare": "simple-git-hooks"` script (runs on `npm install` and `npm ci`)

## Edge cases

- **No src/ directory**: `--no-errors-on-unmatched` prevents Biome from exiting 1 when `src/` is empty or missing.
- **Config typo**: `biome.json` with invalid JSON fails `biome check --config-path` with exit non-zero.
- **Conflicting rules**: Disable explicitly in `biome.json` with a comment explaining why.
- **Windows Git Bash**: `simple-git-hooks` writes a POSIX shell script executed via Git for Windows `sh.exe`.
- **Hook already exists**: `simple-git-hooks` overwrites `.git/hooks/pre-commit` on each `npm install`.
- **CI environment**: `prepare` runs in CI on `npm ci` — acceptable, no `git commit` runs in CI builds.
