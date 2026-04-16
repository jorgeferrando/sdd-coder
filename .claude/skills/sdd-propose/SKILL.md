---
name: sdd-propose
description: SDD Propose - Create proposal.md for a new change. Analyzes input completeness, asks clarifying questions to fill gaps, then generates a complete proposal. Usage - /sdd-propose "description" or as part of /sdd-new.
requires: ["openspec/config.yaml"]
produces: ["openspec/changes/{change}/proposal.md"]
---

# SDD Propose

> Create a complete `proposal.md` for a change. Analyzes the user's input, asks questions to fill any gaps, and only generates the document when all sections can be substantively filled.

## Usage

```
/sdd-propose "description"   # Create proposal from description
/sdd-propose TICKET-123      # Create proposal from ticket
```

## Prerequisites

- `openspec/` initialized (`/sdd-init`)
- Codebase exploration done (or run `sdd-explore` first)

## Step 1: Determine change name

If not already created, choose a short kebab-case name and create the directory:
```bash
mkdir -p openspec/changes/{change-name}
```

## Step 2: Gather context

Read available context before analyzing gaps:

- If `sdd-explore` was run (via `sdd-new`), read `openspec/changes/{change-name}/notes.md` for exploration findings to inform Impact, Scope, and Dependencies.
- Check `openspec/steering/` for project conventions and tech stack.

## Step 3: Analyze completeness

Map the user's input against the required proposal sections. For each section, determine if you have enough information to write substantive content (not placeholders):

| Section | What you need |
|---------|--------------|
| **Context / Background** | Why this change is needed *now*. Business or technical trigger. |
| **Problem** | Clear description of what is wrong or missing. Observable symptoms. |
| **Scope** | What is included AND what is explicitly excluded. |
| **Proposed Solution** | High-level approach. Enough to evaluate feasibility, not implementation detail. |
| **Alternatives Discarded** | At least one alternative considered and why it was rejected. |
| **Risks & Mitigations** | What could go wrong. How to reduce or handle each risk. |
| **Impact** | Files/domains affected, what needs testing. |
| **Dependencies** | External services, other teams, features, or changes that block or are blocked by this. |
| **Acceptance Criteria** | Concrete, verifiable conditions that define "done". |

Mark each section as: **covered** (you can write it), **inferable** (you can reasonably deduce it from context), or **missing** (you need user input).

## Step 4: Ask clarifying questions

For every section marked **missing**, ask the user using `AskUserQuestion`. Group related questions into a single ask when possible, but do not bundle more than 3-4 questions at once.

**Question guidelines:**
- Be specific, not generic. Instead of "Can you describe the problem?", ask "What is the current behavior when X happens, and what should happen instead?"
- Offer options when you can infer likely answers: "Is the goal to (a) replace the existing cache entirely or (b) add a caching layer in front of it?"
- For Scope: always ask what is explicitly out of scope if the user did not mention it.
- For Acceptance Criteria: propose criteria based on the problem and solution, then ask the user to confirm or adjust.

**Repeat** this step until all sections are **covered** or **inferable**. Do not proceed to Step 5 with any section still **missing**.

## Step 5: Generate proposal.md

Only when all sections are covered, create `openspec/changes/{change-name}/proposal.md`:

```markdown
# Proposal: {Title}

## Metadata
- **Change:** {change-name}
- **Ticket:** {TICKET-ID or N/A}
- **Date:** {YYYY-MM-DD}

## Context

{Why this change is needed now. Business or technical trigger that motivates the work.}

## Problem

{What is wrong or missing. Observable symptoms or pain points. Why this needs to change.}

## Scope

**In scope:**
- {what this change includes}

**Out of scope:**
- {what this change explicitly does NOT include}

## Proposed Solution

{High-level approach. Enough detail to evaluate feasibility — implementation details go in design.md.}

## Alternatives Discarded

| Alternative | Reason discarded |
|-------------|-----------------|
| {option} | {why not} |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| {risk} | {low/medium/high} | {low/medium/high} | {how to reduce or handle} |

## Impact

- **Files affected:** {estimate}
- **Domains:** {list}
- **Tests:** {what needs testing}

## Dependencies

- {External services, teams, features, or changes that block or are blocked by this. "None" if truly independent.}

## Acceptance Criteria

- [ ] {Concrete, verifiable condition 1}
- [ ] {Concrete, verifiable condition 2}
```

## Step 6: Validate with user

Present the complete proposal and ask **targeted** validation questions:

- "The scope excludes {X} — is there anything else that should be explicitly excluded?"
- "I identified {risk} as the main risk — are there other risks you foresee?"
- "The acceptance criteria are {list} — do these cover your definition of done?"

If the user provides feedback, update the document and re-present the changed sections. Do not regenerate the entire proposal for minor edits.

## Next Step

With `proposal.md` approved → `/sdd-continue` (runs `sdd-spec`).
