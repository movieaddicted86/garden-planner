# Review checklist (lead)

<!-- Managed by ai-dev-framework: do not edit. -->

Gated rules (CI) are not re-read by hand – check that CI is green, then spend the time below.

## 1. Fit
- [ ] Every acceptance criterion is met and visible in the report with file:line.
- [ ] Binding decisions are respected; `## Deviations` is honest (`None.` really means none).
- [ ] Scope: nothing unrelated changed (diff stat matches the task); out-of-scope list respected.

## 1b. Process hygiene
- [ ] STATE row is `in_review`, branch pushed, report written (all three).
- [ ] Nothing written into `.ai/` except STATE and the report; no leftover servers, containers, worktrees, build trees.
- [ ] Commit granularity matches the task (one concern per commit; a justified exception is stated).
- [ ] For refactorings: the baseline was captured before the first move; before/after numbers are in the report.
- [ ] The report's evidence can be reproduced from the numbers given (counts, sizes), not adjectives.

## 2. Design (what linters cannot see)
- [ ] One responsibility per new module; its purpose fits in one sentence without "and".
- [ ] Domain logic lives in the pure core / shared package; UI, routes and slices only orchestrate.
- [ ] No second copy of an existing concept (type, constant, helper, schema, shortcut).
- [ ] New dependencies are justified (decision) and listed in the radar; none sneaked into `package.json`.
- [ ] Public surface of new modules is small; names say what things are for.

## 3. Correctness and robustness
- [ ] Math/format conversions have roundtrip tests with awkward inputs.
- [ ] Error paths, cancel paths and timeouts are tested; resources are released (listeners, timers, child
      processes, GPU resources).
- [ ] Each input crossing a boundary is validated by the shared schema; no second entry point skips it.
- [ ] Anything that pinned old behaviour (tests, E2E specs, docs) was found and updated deliberately.

## 4. Security (if the task touches input, files, processes, network, config keys)
- [ ] Use `docs/principles/04-security-baseline.md` §Review checklist; bypass variants tested.

## 5. Tests
- [ ] New logic has unit tests; a bug fix has a test that failed before.
- [ ] Tests are deterministic (no sleeps as sync, no order dependence); a flaky failure is investigated, not re-run.
- [ ] Touched E2E specs pass; layout/toolbars/sidebars run the spec that pins them.

## 6. Docs and hygiene
- [ ] Changelog "Unreleased", user docs, acceptance/UAT list updated.
- [ ] No commented-out code, no TODO without backlog entry, no stray debug/log output.
- [ ] Commit messages follow the convention; one logical step per commit.

## 7. After the review
- [ ] If the same defect type appeared again: add a mechanical rule (lint/CI/test) — principles 06, rule 4.
- [ ] Record verdict, evidence and findings in `.ai/reviews/T-NNN.md`; keep the chat reply to 2–3 lines.
