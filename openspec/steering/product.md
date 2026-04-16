# Product: SDD Coder

## What it builds

SDD Coder is the autonomous execution engine for the Spec-Driven Development (SDD) methodology. It takes a natural language task description and runs the full SDD pipeline autonomously: propose → spec → design → tasks → apply — producing committed code in the target repo without manual orchestration.

Today a developer using sdd-skills must sit in Claude Code (or Cursor, Codex, Copilot) and manually invoke `/sdd-new`, `/sdd-continue`, `/sdd-apply`, etc. SDD Coder removes that manual step. The developer describes what they want in a chat UI; the agent handles the rest.

## For whom

Developers who already follow (or want to follow) the SDD workflow and want to automate the orchestration. Primary user: a solo developer who likes solving problems but finds the repetitive invocation of skills tedious.

Not targeted at non-technical stakeholders in the MVP. That comes in IT-5 (Slack intake).

## Bounded context (what it does NOT do)

- Does NOT replace the SDD methodology — it executes it. The methodology lives in sdd-skills.
- Does NOT push to `main` or `develop` — always works on `sdd/{change-name}` branches.
- Does NOT manage infrastructure (Jira, billing, multi-repo) in the MVP.
- Does NOT provide its own code editor or IDE — it is a chat-driven agent.
- Does NOT generate code without going through the SDD pipeline (no "just write me X" shortcuts).
