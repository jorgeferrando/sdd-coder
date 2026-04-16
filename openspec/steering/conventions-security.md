# Specialist: Security

> Rules to prevent common security vulnerabilities (OWASP Top 10 and beyond).
> Read by sdd-apply, sdd-audit, and sdd-verify.
> Violations are **Critical** — security issues block PRs.

## Injection (OWASP A03)

- **MUST** use parameterized queries or ORM methods for all database operations. Never concatenate user input into SQL strings.
- **MUST** use templating engines with auto-escaping for HTML output. Never insert user input into HTML via string concatenation.
- **MUST** sanitize user input before passing it to shell commands. Prefer library APIs over `exec`/`spawn` with string interpolation.
- **MUST NOT** use `eval()`, `new Function()`, or equivalent dynamic code execution with user-controlled input.

## Authentication & session management (OWASP A07)

- **MUST** hash passwords with bcrypt, scrypt, or argon2. Never store passwords in plain text or with MD5/SHA-1.
- **MUST** use constant-time comparison for tokens and secrets to prevent timing attacks.
- **MUST** set session cookies with `HttpOnly`, `Secure`, and `SameSite` flags.
- **MUST NOT** expose session tokens, API keys, or internal IDs in URLs or query parameters.
- **SHOULD** implement rate limiting on authentication endpoints.

## Secrets management

- **MUST NOT** hardcode secrets (API keys, passwords, tokens, connection strings) in source code, config files, or comments.
- **MUST** read secrets from environment variables or a secrets manager.
- **MUST NOT** log secrets, tokens, or credentials at any log level.
- **MUST** add sensitive files (`.env`, `*.pem`, `*.key`, `credentials.*`) to `.gitignore` before first commit.

## Input validation (OWASP A03)

- **MUST** validate all input at system boundaries (HTTP handlers, CLI parsers, message consumers). Never trust data from external sources.
- **MUST** validate type, format, length, and range — not just presence.
- **MUST** reject unexpected fields in request bodies (allowlist, not denylist).
- **MUST NOT** rely solely on client-side validation. Server-side validation is the authority.

## Access control (OWASP A01)

- **MUST** check authorization on every endpoint or operation that accesses resources. Never rely on obscurity (hidden URLs, unpredictable IDs).
- **MUST** use the principle of least privilege: grant minimum permissions needed.
- **MUST NOT** expose internal error details (stack traces, database errors, file paths) to end users. Log them server-side, return generic messages.

## Data exposure (OWASP A02)

- **MUST** use HTTPS for all external communication. Never send sensitive data over plain HTTP.
- **MUST NOT** return more data than the client needs. Select specific fields, never `SELECT *` sent directly to the response.
- **MUST** mask or omit sensitive fields (email, phone, address) in logs and API responses unless explicitly required.
- **SHOULD** set appropriate CORS headers. Never use `Access-Control-Allow-Origin: *` on authenticated endpoints.

## Dependencies

- **MUST NOT** install packages from untrusted sources or with known critical vulnerabilities.
- **SHOULD** pin dependency versions to avoid supply chain attacks via malicious updates.
- **SHOULD** prefer well-maintained packages with active security response.

## Error handling

- **MUST** catch errors at the boundary layer and return safe generic responses. Never leak internal implementation details.
- **MUST NOT** include stack traces, file paths, or database schema in production error responses.
- **SHOULD** log the full error server-side with request context for debugging.

## How to detect violations

When reviewing code (during sdd-apply or sdd-audit), flag:
1. String concatenation in SQL queries, HTML templates, or shell commands
2. Any occurrence of `eval()`, `new Function()`, or dynamic code execution
3. Secrets, tokens, or API keys in source code (including test files)
4. Missing input validation on HTTP handlers or public API methods
5. `SELECT *` results passed directly to API responses
6. Passwords stored with reversible encryption or weak hashing
7. Cookies without `HttpOnly` or `Secure` flags
8. `Access-Control-Allow-Origin: *` on non-public endpoints
9. Stack traces or internal paths in error responses

Classify as **Critical** — security vulnerabilities block PRs. There is no acceptable level of known security risk.
