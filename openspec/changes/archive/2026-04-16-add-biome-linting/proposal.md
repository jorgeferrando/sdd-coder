# Proposal: Add Biome Linting

**Change:** add-biome-linting
**Date:** 2026-04-16
**Status:** approved

---

## Context

SDD Coder uses TypeScript 5 strict mode throughout. `tech.md` lists the linter as "to be decided (ESLint + Prettier or Biome)". No `src/` files exist yet — this is the right moment to set the linter before writing any application code.

## Problem

Without a linter/formatter, code style will drift as soon as `src/` is populated. Enforcing conventions (no `any`, consistent imports, consistent formatting) requires a tool that runs in CI and in the pre-commit loop. Setting it up after the fact forces a large reformatting commit that pollutes git history.

## Scope

- Add Biome as the single lint + format tool
- Configure it for TypeScript strict rules aligned with `conventions.md`
- Wire it into `package.json` scripts (`lint`, `fmt`, `check`)
- Add `biome.json` with project-specific rule overrides
- Update `tech.md` to record the decision

Out of scope: ESLint, Prettier, pre-commit hooks (separate change), CI integration (separate change).

## Proposed Solution

Install `@biomejs/biome` as a dev dependency. Add `biome.json` with:
- `linter.enabled: true` with recommended rules + TypeScript extras
- `formatter.enabled: true` (single-quote strings, 2-space indent, 100-char line width)
- `organizeImports.enabled: true`

Add three npm scripts:
- `lint` — `biome check src/` (lint only, no format write)
- `fmt` — `biome format --write src/` (format write)
- `check` — `biome check --write src/` (lint + format, used in CI)

## Alternatives Discarded

| Alternative | Reason discarded |
|---|---|
| ESLint + Prettier | Two separate tools with config overlap; known incompatibility edge cases; more dependencies to maintain |
| ESLint alone | No formatting; still need Prettier or manual enforcement |
| oxlint | Faster but format-only with Prettier still needed; less mature ecosystem |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Biome rule conflicts with conventions.md | Review generated config against each MUST rule before finalising |
| No src/ to lint yet | Scripts target `src/` — no-op until files exist. Tests can still verify biome.json is valid via `biome check --config-path biome.json` |

## Impact

- `package.json` — 1 new devDependency, 3 new scripts
- `biome.json` — new file (config)
- `openspec/steering/tech.md` — update linter line
- `openspec/steering/conventions.md` — add Biome-specific rules (no `any` enforced by Biome `noExplicitAny`)
- No existing source files affected (none exist yet)

## Dependencies

None. Requires only npm and Node.js 24 (already present).

## Acceptance Criteria

- [ ] `npm install` succeeds with `@biomejs/biome` in devDependencies
- [ ] `npx biome check --config-path biome.json` exits 0 (valid config)
- [ ] `npm run lint` runs without crashing (no src/ = no files = exit 0)
- [ ] `npm run fmt` runs without crashing
- [ ] `npm run check` runs without crashing
- [ ] `biome.json` enforces: `noExplicitAny`, consistent imports, 2-space indent, 100-char line, single-quote strings
- [ ] `tech.md` updated: linter line reads "Biome — lint + format, single tool"
- [ ] `conventions.md` updated: reference to Biome for `any` enforcement
