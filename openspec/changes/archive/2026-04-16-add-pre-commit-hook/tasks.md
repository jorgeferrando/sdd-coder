# Tasks: add-pre-commit-hook

**Change:** add-pre-commit-hook
**Branch:** add-pre-commit-hook
**Total tasks:** 1

---

## Task list

- [x] **T01** `package.json` — Add `simple-git-hooks` devDependency, `prepare` script, and `simple-git-hooks` config key; run `npm install` to activate the hook
  - Commit: `[add-pre-commit-hook] Add simple-git-hooks pre-commit hook`
  - Validation:
    - `.git/hooks/pre-commit` exists after `npm install`
    - `git commit --allow-empty -m "test"` triggers the hook and exits 0 (no src/ files)

---

## Acceptance gate (after T01)

```bash
cat .git/hooks/pre-commit          # should contain: npm run check
git commit --allow-empty -m "test hook" --no-verify  # bypass to confirm commit works
git commit --allow-empty -m "test hook"               # should run hook, exit 0, commit
```
