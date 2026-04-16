# Specialist: Anti-Overengineering

> Rules to prevent premature abstraction, unnecessary complexity, and speculative design.
> Read by sdd-apply, sdd-audit, and sdd-verify as part of the steering ruleset.

## Abstractions

- **MUST NOT** create an abstraction (interface, base class, factory, strategy) until there are at least 3 concrete uses. Two similar blocks of code are not yet a pattern — they are two blocks of code.
- **MUST NOT** add configuration or parameterization for behavior that has only one variant today. Build the specific case; generalize when the second variant arrives.
- **SHOULD NOT** create wrapper classes around libraries unless the wrapper adds project-specific behavior. Thin wrappers that just re-export add indirection without value.

## Patterns

- **MUST NOT** use design patterns (Factory, Builder, Strategy, Observer, etc.) unless the problem demonstrably requires the pattern's structural benefit. "It might change in the future" is not a valid justification.
- **MUST** prefer plain functions over classes when there is no state to manage. A class with one method and no fields is a function with extra steps.
- **SHOULD** prefer inline logic over extracted helpers when the logic is used only once and is under 10 lines. A helper called from one place is not reusable — it is hidden.

## Layers and indirection

- **MUST NOT** create more architectural layers than the project's `structure.md` defines. If the project has 2 layers, do not introduce a third "just in case."
- **MUST NOT** add middleware, interceptors, decorators, or hooks for cross-cutting concerns that apply to only one endpoint or function. Apply them directly.
- **SHOULD NOT** split a file into multiple files unless the original exceeds 200 lines or has clearly distinct responsibilities.

## Error handling

- **MUST NOT** create custom exception hierarchies with more than 2 levels of depth unless the error handling logic differs per level.
- **SHOULD NOT** catch exceptions only to re-throw them wrapped in a custom type, unless the custom type adds information (context, error code) that the original lacks.

## Types and generics

- **MUST NOT** create generic types (`<T>`) that are instantiated with only one concrete type. A `Repository<User>` with no other `Repository<X>` is just a `UserRepository`.
- **SHOULD NOT** create union types or enums for values that have no branching logic. If the type does not drive a `switch` or `if`, it is documentation, not code.

## How to detect violations

When reviewing code (during sdd-apply or sdd-audit), flag code that:
1. Introduces a new file that is imported by only one other file
2. Creates a class with only one method
3. Adds a parameter that is always passed the same value
4. Wraps a library call without adding behavior
5. Uses a named pattern (Factory, Strategy, etc.) for fewer than 3 variants

Classify as **Important** (not Critical) — simplicity is a quality goal, not a hard gate.
