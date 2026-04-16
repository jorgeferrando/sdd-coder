---
name: sdd-docs
description: SDD Docs - Generate MkDocs documentation from openspec/ using AI. Run sdd-docs --fill --force to produce publishable docs without placeholders. Usage - /sdd-docs.
requires: ["openspec/specs/"]
produces: ["docs/"]
---

# SDD Docs

> Generate a MkDocs documentation site for any project with `openspec/`.
> Uses an LLM (Claude, GPT, Gemini, etc.) to produce narrative prose directly,
> without placeholders or manual fill steps.

## Usage

```
/sdd-docs          # Regenerate docs/ with rich AI-enriched content
```

## Prerequisites

- `openspec/` exists in the project (if not: run `/sdd-init` first)
- `sdd-tui` installed with the `[fill]` extra: `pip install sdd-tui[fill]`
- `ANTHROPIC_API_KEY` (or another supported LLM env var) available in the environment

## Step 1: Verify environment

Check that the LLM is available:

```bash
echo $ANTHROPIC_API_KEY  # should show a key, not be empty
```

If not configured:
1. Get an API key at https://console.anthropic.com
2. Export it: `export ANTHROPIC_API_KEY=sk-ant-...`
3. (Optional) Add it to `~/.zshrc` or `~/.bashrc` for persistence

## Step 2: Generate documentation

```bash
sdd-docs --fill --force
```

The CLI will read the full `openspec/`, build the project context, and generate:
- `mkdocs.yml` — complete config (nav, Mermaid, Material features)
- `docs/index.md` — narrative homepage (problem, tools, quick start, diagram)
- `docs/reference/{domain}.md` — one page per domain, with prose + REQ/decision tables
- `docs/changelog.md` — from `openspec/changes/archive/`

No placeholders. Output is directly publishable.

## Step 3: Verify result

```bash
mkdocs serve
```

Review in the local browser. If any section is unsatisfactory, edit manually
and commit — the next `sdd-docs --fill --force` will regenerate.

## Fallback without API key

If `ANTHROPIC_API_KEY` is not available, the CLI warns and generates with placeholders:

```bash
sdd-docs --force  # without --fill: previous behavior with placeholders
```

In that case, fill the placeholders manually in the generated files.

## Supported providers

| Env var | Provider |
|---------|----------|
| `ANTHROPIC_API_KEY` | Claude (Haiku by default) |
| _(future)_ `OPENAI_API_KEY` | GPT / Codex |
| _(future)_ `GEMINI_API_KEY` | Gemini |

The first available env var wins. See `src/sdd_tui/ai_docs.py` → `make_provider()`.

## Output

```
sdd-docs: Overwritten 10 file(s) (AI-enriched), skipped 0

  +  mkdocs.yml
  +  docs/index.md
  +  docs/reference/core.md
  ...

Next: run 'mkdocs serve' to preview
```
