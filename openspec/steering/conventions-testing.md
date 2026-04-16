# Specialist: Test Design

> Rules for writing tests that are maintainable, meaningful, and not redundant.
> Read by sdd-apply, sdd-audit, and sdd-verify as part of the steering ruleset.

## Test doubles — use the right type

- **MUST** use **stubs** (fixed return values) when the test needs a dependency to return specific data but does not care how many times or in what order it was called.
- **MUST** use **fakes** (simplified working implementations) when the dependency has complex behavior that a stub cannot replicate (e.g., an in-memory database, a fake HTTP server).
- **MUST** use **mocks** (behavior verification) only when the interaction itself is the behavior under test (e.g., "verify that the service calls the audit logger exactly once with these parameters").
- **MUST NOT** use mocks to verify internal implementation details. If the test breaks when you refactor internals without changing behavior, the mock is testing the wrong thing.

## What to test

- **MUST** test behavior, not implementation. A test should answer "what does this do?" not "how does this do it?"
- **MUST** test the public API of each unit. Do not test private methods directly — test them through the public methods that call them.
- **MUST** test error paths and edge cases explicitly. Happy path alone is insufficient.
- **MUST NOT** test framework behavior. Do not test that Express routes a GET request — Express already tested that. Test what YOUR handler does when it receives the request.
- **MUST NOT** test trivial getters, setters, or pass-through methods that contain no logic.

## Redundancy

- **MUST NOT** write multiple tests that exercise the same code path with different data unless the data triggers different behavior. Use parameterized tests or `test.each` instead of duplicating the test body.
- **MUST NOT** duplicate assertions across test levels. If a unit test already verifies that `validate()` rejects invalid email, the integration test should not re-test email validation — it should test the integration point.
- **SHOULD** prefer one assertion per test for behavior clarity. Multiple assertions in one test are acceptable only when they verify different facets of a single operation (e.g., response status AND response body).

## Test structure

- **MUST** follow Arrange-Act-Assert (or Given-When-Then) structure. Each section should be visually separable.
- **MUST** name tests as behavior descriptions: `returns 404 when user not found` not `test_get_user_3` or `should work`.
- **MUST NOT** use conditional logic (if/else, loops) inside tests. A test with branching logic is multiple tests hiding in one.
- **SHOULD** keep test setup under 10 lines. If setup is complex, extract a test helper or builder — but only if used by 3+ tests (see anti-overengineering rules).

## Test isolation

- **MUST** ensure tests can run in any order and produce the same result. No test may depend on state left by a previous test.
- **MUST NOT** share mutable state between tests. Each test creates its own fixtures.
- **SHOULD** prefer in-process fakes over external services (test containers, real databases) for unit tests. Reserve external dependencies for integration tests.

## Assertions

- **MUST** assert on specific values, not on truthiness. `assert.strictEqual(result, 42)` not `assert.ok(result)`.
- **MUST NOT** assert on object identity or internal structure when behavior can be verified through the public API.
- **SHOULD** use custom assertion messages when the default failure message is ambiguous.

## How to detect violations

When reviewing tests (during sdd-apply or sdd-verify), flag:
1. Mocks that verify call counts or argument order for non-essential interactions
2. Tests named `test1`, `test_it_works`, or `should be correct`
3. Two or more tests with identical structure but different input data (→ parameterize)
4. Tests that import private/internal modules
5. Tests with more than 3 lines of mock setup for a single dependency
6. Tests that pass when the implementation is deleted (testing nothing)

Classify as **Important** (not Critical) — test quality is a maintenance concern, not a blocker.
