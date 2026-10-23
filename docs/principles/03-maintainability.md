# 03 – Maintainability

## Size and shape (starting values – the profile fixes the exact numbers and the lint rules)

| Unit | Soft | Hard (review question / lint error) |
|---|---|---|
| File | 300 lines | 400 lines (tests and generated files excepted) |
| Function | 40 lines | 80 lines |
| Parameters | 4 | 6 (more → an options object) |
| Nesting depth | 3 | 4 |
| Cyclomatic complexity | 10 | 15 |
| Component (UI) | 150 lines | 250 lines → extract subcomponents/hooks |

- **MUST** limits are enforced by the linter or CI, not by good intentions (06). A limit that exists only in a
  document is a limit that gets ignored; the early projects found 1500-line files only in an audit.
- Split by responsibility, not alphabetically ("utils.ts" and "helpers.ts" are smells, name by the job).
- Delete dead code in the commit that makes it dead. No commented-out code. No TODO without a backlog entry.

## Naming and comments

- Verbs for functions (`computeBounds`), nouns for data, `is/has/can` for booleans. No abbreviations except
  established ones of the domain.
- Comments explain **why** (constraint, trade-off, link to a decision); the code explains what.
  Exported functions and types get a one-line doc comment.
- A rule exception is written next to the code: `// eslint-disable-next-line <rule> -- <reason>`.

## Errors and logging

- Throw typed errors in the core; catch them at the edge. Never swallow an error silently; an empty `catch` has a
  comment saying why that is correct.
- Every promise is awaited or deliberately detached (`void f()` with the reason). Lint rule: no floating promises.
- Logs are structured, carry a correlation id, and never contain secrets or personal data.

## Dependencies

- **MUST** no new runtime dependency without a decision (task binding decision or ADR): what it replaces,
  maintenance status, licence, size, migration path. Dev dependencies are cheaper but follow the same list.
- Prefer the platform and the standard library; prefer one well-known library over several small ones.
- Pin by lock file; update on a schedule in small grouped steps (05), never "everything at once".
- Check licences automatically in CI when the project is distributed.

## Documentation that stays true

- README: what it is, how to run it, how to test it – short, with screenshots only if they are regenerated.
- One changelog (`CHANGELOG.md`, "Unreleased" section) updated in the same commit as the change.
- Decisions with lasting consequences are written down as short ADRs (`docs/adr/NNNN-title.md`: context,
  decision, consequences). Reviews and audits live in `docs/audits/` with a date.
- Generated documentation (API schema, feature lists) is generated, not typed twice.

## Readability checklist (review)

- Can I explain what this module does in one sentence without "and"?
- Is the public surface of the module small and named by intent?
- Are there two ways to do the same thing in the code base? Pick one and migrate.
- Could a newcomer find where to change X from the folder names alone?
