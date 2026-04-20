# Spec: Biome Linting — Tooling Domain

**Change:** add-biome-linting
**Domain:** tooling
**Date:** 2026-04-16

---

## Behavior

### Given a fresh clone with no src/ files

**When** `npm run lint` is executed
**Then** Biome exits 0 (no files to check = no errors)

**When** `npm run fmt` is executed
**Then** Biome exits 0 (no files to format)

**When** `npm run check` is executed
**Then** Biome exits 0 (lint + format, no files)

---

### Given a TypeScript file that uses `any`

```ts
// src/example.ts
const x: any = 42;
```

**When** `npm run lint` is executed
**Then** Biome reports a `noExplicitAny` lint error and exits non-zero

---

### Given a TypeScript file with inconsistent formatting

```ts
// src/example.ts — 4-space indent, double-quote strings
function foo()  {
    const x = "hello"
    return x
}
```

**When** `npm run fmt --write` is executed
**Then** Biome rewrites the file with 2-space indent, single-quote strings, and normalised whitespace

---

### Given `biome.json` is present

**When** `npx biome check --config-path biome.json` is executed
**Then** Biome exits 0 (config is valid and parseable)

---

## Business rules

1. **BR-01** Biome is the single lint + format authority. No ESLint, no Prettier.
2. **BR-02** `noExplicitAny` rule is enabled — enforces the `conventions.md` TypeScript MUST.
3. **BR-03** `organizeImports` is enabled — import order is automatic, not manual.
4. **BR-04** Line width = 100 characters. Indent = 2 spaces. Quotes = single.
5. **BR-05** `lint` script is read-only (check only). `fmt` writes. `check` writes + lint together.
6. **BR-06** Scripts target `src/` only. Test files and config files are excluded from `--write` scope for now.

---

## Edge cases

- **No src/ directory**: `biome check src/` with no files should exit 0. Biome handles empty targets gracefully.
- **Config typo**: `biome.json` with invalid JSON fails `biome check --config-path` with exit non-zero. Detected in T01 before any other tasks.
- **Conflicting rules**: If a recommended rule conflicts with project conventions, disable it explicitly in `biome.json` with a comment explaining why.
