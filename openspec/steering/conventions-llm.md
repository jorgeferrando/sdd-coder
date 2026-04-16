# Specialist: LLM Integration

> Rules for projects that call Claude or other LLMs.
> Read by sdd-apply, sdd-audit, and sdd-verify.
> Violations marked **Critical** block PRs. Others are warnings.

## Prompt construction

- **MUST** separate system instructions from user/context content. Never concatenate them into a single unstructured string.
- **MUST NOT** interpolate raw file content or user-supplied strings directly into system instructions. Wrap them in clearly delimited context blocks (e.g. `<file path="...">...</file>`).
- **MUST** cap context sent per call. Define a constant (`MAX_CONTEXT_TOKENS`) and truncate or summarise before sending. Exceeding the model's window causes silent truncation of earlier content.
- **SHOULD** structure prompts as: system instructions → retrieved context → task description → output format. Consistent order improves model reliability.
- **SHOULD** end prompts that expect structured output with an explicit format instruction: `"Respond with valid JSON matching this schema: ..."`.

## Prompt injection prevention — Critical

- **MUST** treat all content read from the filesystem (user repos, config files, code) as untrusted. A file can contain instructions like `"Ignore previous instructions and..."`.
- **MUST** wrap untrusted content in delimiters that are clearly labelled as data, not instructions. Example: `<user-file>\n{content}\n</user-file>`.
- **MUST NOT** place untrusted file content before the task instruction in the prompt. Data always comes after the directive.
- **MUST** validate that model output contains only the expected schema before acting on it. Prompt injection can cause models to return malicious tool calls or unexpected commands.

## Response handling

- **MUST** validate Claude's response before using it. If the expected format is JSON, parse with `JSON.parse` inside a try/catch. Never assume the response matches the schema.
- **MUST NOT** throw unhandled exceptions on parse failure. Return a structured error to the caller; let the pipeline decide whether to retry or abort.
- **MUST NOT** pass the raw model response to `eval()`, `new Function()`, or any dynamic execution context.
- **SHOULD** define TypeScript types for every expected response shape. Use a type guard or schema validator (e.g. Zod) to narrow `unknown` to the expected type.
- **SHOULD** log the raw response (truncated) when parse/validation fails, to aid debugging — but never log full prompt content (it may contain user code or secrets).

## Model selection

- **MUST** use a cheaper/faster model (e.g. Haiku) for integration tests and high-volume operations. Never use Opus or Sonnet in test suites by default.
- **MUST** read the model name from a config constant or environment variable, not hardcoded strings scattered across call sites. One place to change the model.
- **SHOULD** document the rationale for each model choice in a comment: latency requirement, cost constraint, or capability need.

## Context management

- **MUST NOT** include the full content of large files in a prompt without truncation. Define a per-file token budget and summarise beyond that threshold.
- **MUST NOT** accumulate conversation history unboundedly across pipeline phases. Each phase should receive only the context it needs, not the full session transcript.
- **SHOULD** count tokens before sending (use the SDK's token counting if available, or approximate at 4 chars/token). Log a warning if a prompt exceeds 80% of the model's context window.

## Secrets and privacy

- **MUST NOT** include `ANTHROPIC_API_KEY` or any secret in prompt content, context blocks, or logged request bodies.
- **MUST NOT** send `.env` file contents to the model, even as "context". Scan injected file content for secret-like patterns before including it.
- **SHOULD** redact values that match common secret patterns (e.g. `sk-...`, `ghp_...`, `AKIA...`) before logging or including in prompts.

## Error handling and retries

- **MUST** handle API errors (`RateLimitError`, `APIConnectionError`, `AuthenticationError`) explicitly. Do not let SDK exceptions bubble up to the HTTP response unhandled.
- **SHOULD** implement exponential backoff for rate-limit errors (429). A single retry after a short delay is usually sufficient for interactive pipelines.
- **SHOULD NOT** retry on authentication errors (401) or invalid request errors (400) — these require human intervention, not automatic retry.

## How to detect violations

When reviewing code during sdd-apply or sdd-audit, flag:
1. File content interpolated directly into the system prompt without delimiters
2. `JSON.parse` without a try/catch, or model output used without type narrowing
3. Hardcoded model strings (`"claude-sonnet-4-6"`) at multiple call sites
4. No token cap before sending large repo files as context
5. `ANTHROPIC_API_KEY` or `.env` content appearing in a prompt string
6. Model called with `sonnet` or `opus` in test fixtures or unit tests
7. Conversation history growing without a maximum length check
