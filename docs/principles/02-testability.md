# 02 – Testability

Testability is a design property, decided by the architecture in 01 before any test is written.

## Principles

- **The logic is testable without the world.** Anything with an algorithm, rule or format is a pure function:
  input in, output out. No browser, server, database, network, clock, randomness or file system needed.
  Time, randomness, ids and I/O come in as parameters or injected dependencies.
- **Test at the cheapest level that can fail for the right reason.**

| Level | What | Speed | Share |
|---|---|---|---|
| Unit | pure functions, reducers/slices, validators, parsers | ms | the large majority |
| Integration | a service or route with a real (fake-backed) boundary: in-memory repo, temp dir, mock HTTP host | 10–500 ms | moderate |
| End-to-end | the real application in a real browser, a few critical user journeys | seconds | few, curated |

- **Roundtrip and property tests for transforms.** Anything that converts or decomposes data
  (matrix ↔ parts, parse ↔ serialise, import ↔ export) gets a roundtrip test with awkward inputs (negative
  scales, empty collections, unicode, huge values). A decompose function that "worked for the examples" lost
  data for mirrored input in a real project.
- **A test pins behaviour, not implementation.** If a refactor that keeps behaviour breaks a test, the test was
  wrong. If a deliberate behaviour change breaks a test, that is the test doing its job – change it in the same
  commit and say so in the report.
- **Tests are deterministic.** No sleeps as synchronisation, no dependence on test order, wall-clock time or
  network. A test that fails once in CI on an unrelated branch is a bug to fix now (race in the code or the
  test), not to re-run – "fixed as a test race" without a reproduction does not count.
- **Sweep new guards against a real corpus.** A validation or safety rule is run over real-world data
  (vendor profiles, production samples, recorded requests) before it is allowed to block anything: 0 false blocks,
  or the rule is a warning. (A sweep over ~9,000 vendor presets found where "forbidden" commands are in fact standard output.)
- **Mock only the boundary** you own (a port/adapter), never the unit under test, never deep internals.

## Definition of done (every task)

1. Typecheck, lint, format check, unit/integration tests and the build pass.
2. New logic has unit tests in the same commit; new error paths have a test.
3. A bug fix starts with a failing test that reproduces the bug.
4. User-visible behaviour: the touched E2E specs pass; a new journey gets a spec only if it is critical.
5. Changed behaviour that an existing test or spec **pins** (counts of buttons, labels, status codes) is updated
   deliberately – search for what pins it before you change it.
6. No new warnings in the browser console or server log on the happy path.
7. Docs updated: changelog entry, user-facing documentation, the acceptance/UAT list if the project keeps one.

## Design checklist for testability

- Can I call this function from a test without importing the UI framework or the web server? If not, split it.
- Is every external effect behind a function or interface that a test can replace?
- Are inputs and outputs plain data (no framework objects, no class instances with hidden state)?
- Does the function return a result instead of mutating shared state?
