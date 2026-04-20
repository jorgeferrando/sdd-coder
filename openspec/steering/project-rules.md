# Project Rules: SDD Coder

> Granular implementation rules that grow as the project evolves.
> Updated when the user corrects AI decisions during /sdd-apply.
> Read by /sdd-apply and /sdd-audit alongside conventions.md.

## Style

(empty — populated as project evolves)

## Tests

(empty — populated as project evolves)

## Architecture

(empty — populated as project evolves)

## Git artifacts

- **MUST** commit every directory under `openspec/changes/` — both active changes and everything under `openspec/changes/archive/`. An untracked `openspec/changes/{name}/` is a project-rule violation regardless of whether the change has been archived. The SDD pipeline produces these artifacts as the authoritative record of why the code looks the way it does, and that record is only valid if it is in git history.
- **MUST** commit canonical specs produced by `/sdd-archive` under `openspec/specs/{domain}/spec.md` in the same PR or immediately after, so the index and the spec stay in sync.
- **MUST** keep SDD-artifact commits atomic and **separate** from source-code commits. `/sdd-apply` commits source files only; artifact commits carry no code changes. Both commit types use the `[{change-name}] ...` message prefix.
- **SHOULD** add a dedicated artifact commit near the end of `/sdd-apply` (after all implementation tasks pass) rather than piggy-backing on the last code commit, to keep diffs reviewable.
