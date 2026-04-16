---
name: sdd-coder
description: Project context for SDD Coder. Load at session start when working on this project.
---

# SDD Coder — Project Context

> Load this file at the start of any session working on this project.
> It references the steering files that define conventions, rules, and stack decisions.

## Quick reference

- **Stack**: Node.js 24 + TypeScript 5 + Fastify 5 + @anthropic-ai/sdk + PostgreSQL 16
- **Architecture**: single service, state machine pipeline, hybrid prompting (skill instructions + TypeScript I/O)
- **Tests**: Vitest — unit (mocked Claude) + integration (Claude Haiku) + manual E2E (Sonnet)
- **Commits**: `[change-name] Description in English, imperative mood`
- **Branches**: `sdd/{change-name}` for all work on the target repo

## What this project is

SDD Coder automates the sdd-skills workflow. It reads skill instructions from the `/skills` volume and uses them as prompts to Claude. Our TypeScript code handles all I/O: file reads/writes, git operations, state persistence, HTTP.

## Steering files (read before implementing)

- `openspec/steering/conventions.md` — architectural rules (MUST/SHOULD/MAY)
- `openspec/steering/project-rules.md` — granular implementation rules (grows with project)
- `openspec/steering/tech.md` — stack details and dependency references
- `openspec/steering/structure.md` — directory layout and layer responsibilities

## Key constraints

- No Python anywhere. Single-language TypeScript stack.
- No LangGraph, no LangChain. Simple state machine, YAGNI.
- No Redis for MVP. Pipeline runs in-process.
- The LLM layer (`src/llm/`) never touches the filesystem or git. Only calls Claude.
- All git operations on `/repo` happen via `src/git/operations.ts`.

## Living rules

When the user corrects a decision the AI made during implementation:
- Ask: "Want me to save this as a rule in project-rules.md for the future?"
- On confirmation: add to project-rules.md in RFC 2119 format
- On second correction of the same pattern: save without asking
