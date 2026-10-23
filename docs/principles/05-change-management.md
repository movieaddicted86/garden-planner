# 05 – Change management: git, refactoring, upgrades, migrations

## Git

- One task = one branch `feature/T-NNN` from the base branch; one commit per logical step.
- Commit message: `<Area>: <imperative summary> (<task id>)`, blank line, bullet body (~72 columns), and a
  `Co-Authored-By:` trailer naming the model that wrote the change.
- The coder never merges, never pushes the base branch, never rewrites published history. The lead merges with
  `--no-ff` so every task stays one revertible unit.
- Never commit secrets, local data, build output or editor/tool settings.

## Refactoring

- Behaviour does not change in a refactoring step; all tests stay green after each step.
- **Pin first:** characterisation tests are written (and committed) *before* code moves.
- Small steps, one concern per commit (`Refactor: move placement math to shared (R-2)`).
- The commit that introduces the shared version deletes the duplicates.
- Large cleanups follow the **audit → packages → order** pattern (playbook `audit-to-refactoring.md`): measure
  first, group findings into work packages, order by risk (pure moves first, store/viewer splits last), one
  package per task, high-risk packages get a stricter review.
- A refactoring that finds a bug fixes it in a **separate** commit/task with its own test.

## Upgrades and migrations

Dependencies age; the cost of an upgrade grows with the distance. So:

1. **Small and regular.** Update bots open grouped PRs weekly: packages that must move together are one group
   (framework + its plugin + its types; linter stack; build tool + plugin). A major version is its own PR and
   task, never hidden in a "minor/patch" group.
2. **Net before change.** The test suite and the E2E journeys are the safety net; a major upgrade starts by
   checking they are green and cover the area the dependency touches.
3. **Runbook per major** (`playbooks/upgrade-major-dependency.md`): read the migration guide, list breaking
   changes that apply, change in the smallest order that keeps the build green, remove workarounds, update the
   radar entry. Record surprises in `docs/upgrades/<package>-<from>-<to>.md`.
4. **Adapters make upgrades local.** If a library is central, the app talks to it through one module; the upgrade
   (or replacement) edits that module.
5. **Pin and explain.** A deliberate hold is written down where the bot cannot miss it (comment in the update
   config, entry in the radar): *what blocks it, what unblocks it, who re-checks when*.
6. **Data migrations** are scripts with a version number, idempotent, tested on a copy, with a documented
   rollback; the app refuses to start on a schema it does not know.
7. **Deprecations:** a technology on *Hold* gets a migration task in the backlog with a target date; new code
   does not use it.

## Introducing something new

A new library, pattern or tool enters only via the radar process:

- **Assess** → read about it, note it in the radar.
- **Trial** → used in exactly one task, with a written decision (ADR) stating the problem, the alternatives
  considered, and how to remove it again. The lead reviews it with extra care.
- **Adopt** → after the trial succeeded and the adoption criteria hold (maintained, ≥ 2 major releases or
  widely used, migration path documented, licence fine). The profile and conventions are updated, the
  framework version is bumped, and existing projects learn about it through `upgrade`.
- **Hold** → no new use; migration task exists.

## Release hygiene

- Shared append-only documents (changelog, test-case lists) are merge hotspots. Identify entries by **task id**,
  not by a running number, and resolve conflicts "keep both"; two parallel branches that both edit the same
  hotspot are merged one after the other.

- Changelog "Unreleased" is updated in each change; releases are cut from the base branch by tag.
- Version numbers are checked by CI where several files carry them (`version:check`).
- Docs-only changes skip the expensive CI jobs; the cheap checks (lint, format, unit) always run.
