# Design: Add Pre-commit Hook

**Change:** add-pre-commit-hook
**Date:** 2026-04-16
**Status:** ready

---

## Overview

A single `package.json` edit installs `simple-git-hooks` and wires a `pre-commit` hook that runs `npm run check`. No new files are created in the repository.

---

## Files to modify

### `package.json` (only file changed)

**Diff — three additions:**

```diff
   "scripts": {
     "dev": "tsx src/server.ts",
     "build": "tsc",
     "test": "vitest run --passWithNoTests",
     "test:int": "vitest run --reporter=verbose --config vitest.integration.ts",
     "lint": "biome check --no-errors-on-unmatched src/",
     "fmt": "biome format --write --no-errors-on-unmatched src/",
-    "check": "biome check --write --no-errors-on-unmatched src/"
+    "check": "biome check --write --no-errors-on-unmatched src/",
+    "prepare": "simple-git-hooks"
   },
   "devDependencies": {
     "@biomejs/biome": "1.9.4",
     "@types/node": "latest",
     "@types/pg": "latest",
+    "simple-git-hooks": "latest",
     "tsx": "latest",
     "typescript": "^5",
     "vitest": "latest"
-  },
+  },
+  "simple-git-hooks": {
+    "pre-commit": "npm run check"
+  },
```

**Complete resulting `package.json`:**

```json
{
  "name": "sdd-coder",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/server.ts",
    "build": "tsc",
    "test": "vitest run --passWithNoTests",
    "test:int": "vitest run --reporter=verbose --config vitest.integration.ts",
    "lint": "biome check --no-errors-on-unmatched src/",
    "fmt": "biome format --write --no-errors-on-unmatched src/",
    "check": "biome check --write --no-errors-on-unmatched src/",
    "prepare": "simple-git-hooks"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "fastify": "^5",
    "pg": "latest"
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "@types/node": "latest",
    "@types/pg": "latest",
    "simple-git-hooks": "latest",
    "tsx": "latest",
    "typescript": "^5",
    "vitest": "latest"
  },
  "simple-git-hooks": {
    "pre-commit": "npm run check"
  },
  "vitest": {
    "globals": true,
    "environment": "node",
    "include": ["test/**/*.test.ts"],
    "exclude": ["test/**/*.integration.ts"],
    "passWithNoTests": true
  }
}
```

---

## Design decisions

### D1 — `simple-git-hooks` over husky

Husky requires a `.husky/` directory and a shell script file per hook, adding configuration surface and files to commit. `simple-git-hooks` has no sub-dependencies, weighs under 1 KB, and reads hook commands directly from `package.json`. For a single hook this is the lowest-friction option. (See proposal.md for full alternatives table.)

### D2 — `prepare` instead of `postinstall`

`prepare` runs on both `npm install` and `npm ci`. `postinstall` only runs on `npm install`. CI pipelines typically use `npm ci` for reproducible installs, so `postinstall` would silently skip hook installation in CI. Although the hook is effectively a no-op in CI (no `git commit` is executed by the build), using `prepare` ensures the mechanism is symmetric across all install paths and avoids a confusing asymmetry if CI behaviour ever changes.

### D3 — `npm run check` instead of `npx biome check`

`npm run check` delegates to the `check` script defined in `package.json`. This means:
- The hook stays in sync with the project's configured command automatically — if the command changes, the hook inherits the change.
- The exact Biome binary path is resolved by npm, not hard-coded in the hook script.
- Behaviour is identical to what a developer runs manually, making the hook predictable.

Using `npx biome check` would bypass the project's `--no-errors-on-unmatched` flag and `--write` flag, producing inconsistent behaviour between manual runs and the hook.

### D4 — `simple-git-hooks: "latest"` (not pinned)

The convention in this project is to pin only when version drift causes rule or behaviour changes:
- `@biomejs/biome` is pinned to `1.9.4` because Biome lint rules change between versions, and a minor upgrade could introduce new violations that block commits unexpectedly.
- All other devDependencies use `latest` because their APIs are stable across minor/patch versions.

`simple-git-hooks` is pure plumbing — it reads a key from `package.json` and writes a shell script to `.git/hooks/`. Its interface has been stable since v2 and it has no lint rules. Using `latest` matches the project pattern and avoids manual version maintenance.

---

## Implementation sequence

There is exactly one task: edit `package.json` with the three additions above, then run `npm install` to materialise the hook.

No other files are touched.
