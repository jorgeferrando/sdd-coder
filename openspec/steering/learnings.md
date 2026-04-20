# Project Learnings

> Incremental memory. Appended by sdd-archive after each change cycle.
> Read by sdd-recall before searching the archive.
> Each entry captures non-obvious decisions, couplings, and anti-patterns.

---

## 2026-04-20 — bootstrap-fastify-server

**Domains touched:** http (new), steering (project-rules.md)

**Decisions:**
- Clean-architecture layout from `structure.md` is a *target*, not a day-1 requirement. A single `src/server.ts` is accepted as the whole composition root until a second adapter or route makes the split meaningful. Future changes that introduce `ports/`, `application/`, or `infrastructure/http/` directories should do so as a migration step with a real inhabitant, not as scaffolding.
- Fastify 5 defaults for `errorHandler` and `notFoundHandler` already emit structured JSON with no stack traces. They satisfy the `conventions.md` MUST without writing any custom code. Custom handlers enter the codebase only when a consumer pins an expected error shape.
- Manual validation (`docker compose up` + `curl`) is a legitimate Quality Gate when the change is wiring/config with no logic. The testing specialist's "MUST NOT test framework behavior" rule pre-empts ceremony tests for trivial endpoints.

**Discarded alternatives:**
- Wrapping the entrypoint in `async function main() { await app.listen(...) }` — rejected. ESM + `NodeNext` supports top-level `await` natively; the wrapper adds no testability and costs a function + call site.
- Including a `pg` ping inside `/health` — rejected. Conflates liveness with readiness and pulls DB wiring into a server-only change. Liveness-only is the orthodox split.
- Writing an `app.inject()` smoke test for `/health` — rejected. The only non-framework behavior is the literal `{ status: 'ok' }`; test arrives when the first route with real logic exists.

**Unexpected couplings:**
- `docker-compose.yml` ports mapping `${PORT:-3000}:3000` pins the *internal* container port to a literal `3000`. Anyone later making the internal port env-configurable must edit the compose mapping and the spec together (BR-02 pins the internal value as a constant today).

**Anti-patterns confirmed:**
- Fastify binding to the default `localhost` inside Docker → container is silently unreachable, no error, the `app` looks "healthy" but refuses all external traffic. This is a recurring Node-in-Docker trap. Hard-coded as BR-01.
- Killing the dev server with `kill $NPMPID` on Git Bash / Windows does not propagate to the `node` child — the port stays held. Use `taskkill //F //PID <node-pid>` (found via `netstat -ano | grep :3000`) for a reliable cleanup when the orchestrator has to stop and start the dev server.

**Process learnings:**
- The rule "every `openspec/changes/` directory, active or archived, MUST be committed" was established mid-change after discovering three archived change dirs plus a canonical spec sitting untracked on master. Codified in `project-rules.md` under "Git artifacts" and persisted to auto-memory. Audit at the start of every new change until the housekeeping PR lands.

**Open questions:**
- `HEAD /health` currently returns `404` (Fastify 5 does not auto-register `HEAD` for `GET`). No consumer requires it today. When an external probe (LB, K8s) appears, decide: explicit registration, or a plugin that auto-shadows `GET` with `HEAD`.
- `skills-lock.json` at the project root: its purpose (lockfile for installed SDD skills?) is not documented in the steering. A future change should either document it in `tech.md` or add it to `.gitignore` if it turns out to be per-developer.
