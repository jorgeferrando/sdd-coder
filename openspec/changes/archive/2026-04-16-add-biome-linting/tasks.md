# Tasks: add-biome-linting

**Change:** add-biome-linting
**Branch:** add-biome-linting
**Total tasks:** 4

---

## Task list

- [x] **T01** `package.json` — Add `@biomejs/biome` devDependency and `lint`/`fmt`/`check` scripts; run `npm install`
  - Commit: `[add-biome-linting] Add Biome devDependency and npm scripts`
  - Note: install the package so biome CLI is available for T02 validation

- [x] **T02** `biome.json` — Create Biome config (recommended rules + noExplicitAny, useConst, noVar; formatter 2-space/100-char/single-quote)
  - Depends on: T01 (biome CLI must be installed to validate config)
  - Commit: `[add-biome-linting] Add biome.json with TypeScript-aligned config`
  - Validation: `npx biome check --config-path biome.json` exits 0

- [x] **T03** `openspec/steering/tech.md` — Replace linter placeholder line with "Biome 1.9.4" and add lint/fmt/check dev commands
  - Commit: `[add-biome-linting] Update tech.md: record Biome as linter/formatter`

- [x] **T04** `openspec/steering/conventions.md` — Annotate MUST NOT `any` rule with Biome enforcement note
  - Commit: `[add-biome-linting] Update conventions.md: link noExplicitAny to Biome rule`

---

## Bugs found during apply

- [x] **BUG01** `package.json` — Biome 1.9.4 exits 1 with "No files were processed" when `src/` is empty
  - Fix: add `--no-errors-on-unmatched` to all three scripts in package.json
  - Commit: `[add-biome-linting] Fix Biome scripts to handle empty src/`

---

## Dependencies

```
T01 → T02 → (T03, T04 in parallel)
```

T03 and T04 have no dependency on each other; both depend on T02 being done (biome validated).

---

## Acceptance gate (after T02)

```bash
npm run lint   # exit 0 — no src/ files yet
npm run fmt    # exit 0
npm run check  # exit 0
npx biome check --config-path biome.json  # exit 0 — valid config
```
