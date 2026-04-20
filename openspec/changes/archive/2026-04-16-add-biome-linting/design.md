# Design: Add Biome Linting

**Change:** add-biome-linting
**Date:** 2026-04-16
**Status:** draft

---

## Overview

Install `@biomejs/biome` as the single lint + format tool. Wire it into `package.json` scripts.
Create `biome.json` with TypeScript-aligned rules. Update steering docs to record the decision.

No source files are affected — `src/` is empty at this stage, which makes this a zero-friction setup.

---

## Files to create / modify

### 1. `biome.json` — CREATE

**Rationale:** Biome requires a config file at the project root. All rule customisations live here
rather than on the CLI so that `npx biome check --config-path biome.json` can validate the config
independently, and so that editors (VS Code Biome extension) pick it up automatically.

**Full content:**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error"
      },
      "style": {
        "useConst": "error",
        "noVar": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "lineWidth": 100,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "coverage",
      "openspec",
      "*.json",
      "*.md"
    ]
  }
}
```

Key choices:
- `$schema` pinned to `1.9.4` (see version decision below).
- `noExplicitAny: "error"` — enforces the MUST NOT `any` rule from `conventions.md`.
- `useConst: "error"` and `noVar: "error"` — enforce idiomatic TypeScript, safe additions.
- `recommended: true` — catches the broad class of suspicious/correctness issues without manual
  enumeration.
- `lineWidth: 100`, `indentStyle: "space"`, `indentWidth: 2`, `quoteStyle: "single"` — match
  `conventions.md` style requirements exactly.
- `trailingCommas: "all"` — reduces diff noise in multi-line structures; idiomatic in TS projects.
- `semicolons: "always"` — explicit termination; avoids ASI edge cases.
- `files.ignore` excludes `node_modules`, `dist`, `coverage` (standard), `openspec` (Markdown/JSON
  docs are not application code), and `*.json` / `*.md` at the root so config files and docs are
  never auto-reformatted by `fmt`.

---

### 2. `package.json` — MODIFY

**Action:** Add one `devDependency` and three `scripts`.

**Diff description:**

In `devDependencies`, add:
```json
"@biomejs/biome": "1.9.4"
```

In `scripts`, add:
```json
"lint":  "biome check src/",
"fmt":   "biome format --write src/",
"check": "biome check --write src/"
```

**Rationale:**
- `lint` — read-only check; used by developers to see violations without mutating files. Safe to
  run in review loops.
- `fmt` — format-only write; lets developers apply formatting without triggering lint failures that
  block them mid-session.
- `check` — full lint + format write; intended for CI and pre-commit hooks (pre-commit hook is a
  separate change).
- All three scripts target `src/` only, matching BR-06. `test/` files are not in scope for `--write`
  at this stage; they can be added when the test suite is established.

---

### 3. `openspec/steering/tech.md` — MODIFY

**Action:** Replace the linter/formatter line under **Tools**.

**Old line:**
```
- Linter/formatter: to be decided at project setup (ESLint + Prettier or Biome)
```

**New line:**
```
- Linter/formatter: Biome 1.9.4 — lint + format, single tool (`biome.json` at project root)
```

**Rationale:** `tech.md` is the canonical record of tooling decisions. The placeholder line must be
replaced so future readers and `/sdd-audit` checks see the resolved state.

Also append to the **Dev commands** block:

```bash
npm run lint      # biome check src/ (read-only)
npm run fmt       # biome format --write src/
npm run check     # biome check --write src/ (lint + format)
```

---

### 4. `openspec/steering/conventions.md` — MODIFY

**Action:** Append a note to the **TypeScript** section's `MUST NOT use any` rule.

**Old line:**
```
- **MUST NOT** use `any`. Use `unknown` and narrow with type guards.
```

**New line:**
```
- **MUST NOT** use `any`. Use `unknown` and narrow with type guards.
  Enforced by Biome rule `suspicious/noExplicitAny` (set to `"error"` in `biome.json`).
```

**Rationale:** Linking the convention to the tool rule makes it clear the enforcement is automatic,
not just advisory. Auditors and new contributors see immediately where the check comes from.

---

## Design decisions

### D1 — Biome version: pin to `1.9.4`, not `latest`

**What:** `@biomejs/biome` is pinned at `1.9.4` rather than `latest`.

**Why:** Other `devDependencies` use `latest` for framework-adjacent packages (`vitest`, `tsx`,
`@types/*`) where patch upgrades are low-risk. Biome is different: a minor upgrade can introduce new
lint rules that fail CI on existing source files with no code change from the developer. Pinning to
a specific version keeps the CI green line stable. The version can be bumped intentionally as a
tracked change.

`1.9.4` is the current stable release as of 2026-04-16 and the version whose JSON schema URL is used
in `biome.json` (`$schema`), ensuring the schema reference stays consistent with the installed
binary.

**Alternatives considered:**
- `"latest"` — convenient, but risks surprise CI failures when Biome ships new recommended rules.
- `"^1.9.0"` — allows patch updates, but Biome's patch releases occasionally add new lint rules
  under `recommended`, making the range semantically wider than semver implies for linters.

---

### D2 — Rules beyond `recommended`: `noExplicitAny`, `useConst`, `noVar`

**What:** Three explicit rule overrides on top of `recommended: true`.

**Why:**
- `noExplicitAny` — directly maps to `conventions.md` MUST NOT. `recommended` does not enable this
  by default; it must be opted in.
- `useConst` — enforces `const` over `let` when the binding is never reassigned. Reduces mutable
  state surface. Part of idiomatic strict TypeScript.
- `noVar` — bans `var` declarations. `var` is never appropriate in ES2022+ TypeScript; this closes
  the gap `recommended` leaves open.

No other extra rules are added at this stage (YAGNI). Further rules can be added in a dedicated
`/sdd-ff "tighten biome rules"` change once `src/` files exist and we can see what fires.

**Alternatives considered:**
- Adding `useTemplate`, `noConsoleLog`, `noDefaultExport` — potentially useful but premature without
  any source files to validate against. Deferred.
- Disabling some `recommended` rules — not needed yet; no conflicts identified.

---

### D3 — Lint scope: `src/` only, not `src/ test/`

**What:** All three scripts target `src/` only.

**Why:** BR-06 from the spec explicitly scopes `--write` to `src/`. `test/` files do not exist yet.
Including a non-existent directory causes Biome to exit with an error on some versions. When test
files are added, the scope can be widened (or a separate `lint:test` script added) via a follow-up
change.

`lint` (read-only) could safely target both `src/` and `test/` even with no test files, but keeping
all three scripts symmetric (same target) avoids confusion.

**Alternatives considered:**
- `biome check .` — lints everything including `node_modules` unless explicitly ignored. More error-
  prone; requires a thorough `files.ignore` list to be safe.
- `src/ test/` — correct long-term target, but premature while `test/` is empty.

---

### D4 — `files.ignore` contents

**What:** Ignore `node_modules`, `dist`, `coverage`, `openspec`, `*.json`, `*.md`.

**Why:**
- `node_modules`, `dist`, `coverage` — standard exclusions.
- `openspec` — contains Markdown and JSON files that are documentation, not application code.
  Formatting them with JS rules would be wrong (Biome would apply JS formatter settings to JSON
  files, and Markdown is not supported by Biome's formatter).
- `*.json` at root — `package.json`, `tsconfig.json`, `biome.json` itself should not be
  auto-reformatted; they have their own authoring conventions (e.g. `tsconfig.json` has comments).
- `*.md` at root — `README.md` and similar are documentation.

**Alternatives considered:**
- Not ignoring `*.json` — Biome can format JSON files, but reformatting `package.json` /
  `tsconfig.json` on `npm run fmt` would produce unexpected diffs and confuse reviewers.
- Ignoring `test/` in `files.ignore` — not needed since scripts already target `src/` explicitly.
  Over-specifying ignore rules adds maintenance cost.

---

## Constraints satisfied

| Constraint (from conventions.md / proposal) | Satisfied by |
|---|---|
| No `any` | `noExplicitAny: "error"` in `biome.json` |
| TypeScript strict | `tsconfig.json` already has `strict: true`; Biome does not touch tsconfig |
| Single-quote strings | `quoteStyle: "single"` in `biome.json` javascript.formatter |
| 2-space indent | `indentStyle: "space"`, `indentWidth: 2` in formatter |
| 100-char line width | `lineWidth: 100` in formatter |
| `lint` = check only | `biome check src/` (no `--write`) |
| `fmt` = format write | `biome format --write src/` |
| `check` = lint + format write | `biome check --write src/` |
| No ESLint, no Prettier | BR-01; only `@biomejs/biome` added |
| organizeImports enabled | `organizeImports.enabled: true` |

---

## Open questions

None. Scope is fully bounded. No unknowns requiring resolution before tasks are written.
