# 06 – Enforcement: every rule has a tool or a reviewer

**Lesson:** the first projects had good written guidelines (file ≤ 400 lines, no cycles, one source of truth) and
still grew 1500-line files and mirrored copies, because nothing failed when the rule was broken. They were found
by an audit and cost a dozen refactoring tasks. A rule without enforcement is a wish.

## Enforcement levels

| Level | Meaning | Examples |
|---|---|---|
| **Gate** | CI fails; the autopilot cannot merge | typecheck, lint (incl. `max-lines`, complexity, boundaries, no-floating-promises, no-any), format check, unit/integration tests, build, dependency cycles, version check, vulnerability scan (high) |
| **Warn** | visible in the CI summary and in review, does not fail | duplicate code (jscpd), files above the soft limit, bundle-size growth, TODO without backlog entry |
| **Review** | judged by the lead using the checklist | naming, one-sentence module test, abstraction level, comment quality, product fit |

## Rules for rules

1. **New MUST rule → new check in the same change.** If no tool can check it, it is a SHOULD with a review
   checklist line, not a MUST.
2. **Introduce a gate on existing code with a ratchet.** Start with the current worst values as the limit
   (or list existing violations in a baseline file), fail on *new* violations, lower the limit when a task
   reduces it. Never switch on a rule that fails 300 places on day one.
3. **Warn first for a sprint, then gate** when a rule is noisy.
4. **A repeated defect becomes a mechanical rule.** Two review findings of the same kind → add the lint rule,
   test helper or CI check; do not add another paragraph to the guidelines.
5. **Exceptions are explicit and local** (`-- reason` on the disable comment, entry in the baseline file with the
   task that will remove it).
6. **The lead reads the gate list, not the code, for gated rules** — review time goes to design and risk.

## Starting gate set (profile `react-ts-vite` ships it)

typecheck · eslint (typescript-eslint type-aware, react-hooks, `max-lines`, `complexity`, `max-params`,
`max-depth`, `no-floating-promises`, `no-explicit-any`, import boundaries) · prettier check · unit tests ·
build · `madge --circular` · version check · `npm audit --omit=dev --audit-level=high` · CI shard of E2E.
