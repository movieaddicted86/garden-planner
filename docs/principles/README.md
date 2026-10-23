# Engineering principles (stack-neutral)

Binding for every project that uses ai-dev-framework, together with the conventions of its stack profile
(`docs/CONVENTIONS.md`, `docs/CODING-GUIDELINES.md`) and the project's own additions
(`docs/PROJECT-CONVENTIONS.md`). Where they disagree, the order is: project > profile > principles – but a
project deviates only with a written reason (commit body or ADR).

| File | Subject |
|---|---|
| [01-architecture.md](01-architecture.md) | modularity, layers, boundaries, one source of truth |
| [02-testability.md](02-testability.md) | pure core, test pyramid, definition of done |
| [03-maintainability.md](03-maintainability.md) | size limits, naming, errors, comments, dependencies |
| [04-security-baseline.md](04-security-baseline.md) | the minimum every web application meets |
| [05-change-management.md](05-change-management.md) | git, small steps, refactoring, upgrades and migrations |
| [06-enforcement.md](06-enforcement.md) | which rule is checked by which tool – and what that means for new rules |

## How to read a rule

- **MUST** – a review blocker. Mechanically enforced wherever a tool can do it (see 06).
- **SHOULD** – the default; deviating needs a one-line reason in the commit or report.
- **MAY** – a suggestion.

## The three questions behind every rule

1. *Can a newcomer find it?* (folder and file names say what is inside)
2. *Can it be tested without the world around it?* (no browser, server, clock or disk needed for the logic)
3. *Does changing it touch one place only?* (one source of truth, small modules, no copies)

## Established over novel

Choose boring technology on purpose. A new library, pattern or tool enters a project only through the process
in the profile's `radar.md` (Adopt / Trial / Assess / Hold): proven, maintained, with a documented migration
path. Novelty is allowed – as a trial in one task, with a written decision, behind an interface that makes it
replaceable.
