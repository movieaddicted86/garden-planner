# Engineering conventions – React + TypeScript + Vite profile

<!-- Managed by ai-dev-framework (profile react-ts-vite): do not edit. Project additions: PROJECT-CONVENTIONS.md. -->

Binding for human and LLM contributors. Process and architecture principles: `docs/principles/`. Architecture
and clean-code rules of this stack: `CODING-GUIDELINES.md`. Project-specific additions: `PROJECT-CONVENTIONS.md`.

## 1. Toolchain

| Tool | Choice | Why |
|---|---|---|
| Language | TypeScript `strict`, ESM everywhere | one language across web, server, shared |
| Runtime | Node LTS (set `engines.node`) | stable, long support window |
| Web | React (current major), Vite, a small state library (Zustand) | established, boring, easy to upgrade |
| Server | Express (current major) or Fastify; `zod` for validation | schemas double as types and as RPC/MCP tool schemas |
| Layout | npm workspaces: `shared/`, `server/`, `web/` | one lock file, shared types without publishing |
| Unit tests | `node:test` + `assert` (server, shared), Vitest for web components if a DOM is needed | no extra framework where the platform suffices |
| E2E | Playwright against the built app (Docker image or `npm start`) | real browser, real server |
| Lint / format | ESLint flat config (+ `eslint.base.mjs` of this profile), Prettier | arbiter of style, so reviews are about design |
| Cycles / boundaries | `madge --circular`, ESLint boundary rules | enforced architecture |
| CI | GitHub Actions: `check` job + sharded `e2e` job; Dependabot grouped | see `.github/workflows/ci.yml` |

Root `package.json` scripts every project provides (the autopilot and the task templates assume them):
`typecheck`, `lint`, `format`, `format:check`, `test`, `build`, `e2e` (and `e2e:docker` if the app ships an image).
All workspace test globs are **quoted** (`tsx --test "src/**/*.test.ts"`) so they behave the same under `sh` and `cmd`.

## 2. Code style

- `strict` TypeScript; no `any` (use `unknown` + narrowing); no `@ts-ignore` (use `@ts-expect-error -- reason`).
- Prettier decides formatting (2 spaces, single quotes, semicolons, trailing commas, 120–140 columns). Run
  `npm run format` before committing; never hand-format. `endOfLine: auto` on Windows-friendly projects.
- ESLint decides code smells; a disable comment needs `-- <reason>` and sits on the line the rule reports.
- Server imports use ESM with `.js` suffix when compiled by `tsc` for Node.
- Exported functions have explicit return types and a one-line JSDoc. Comments explain *why*.
- No commented-out code; no TODO without a backlog entry.
- **No new runtime dependency without a decision** (task binding decision or ADR). Check `radar.md` first.
- Keep functions pure where possible so they can be unit-tested.

## 3. Web specifics

- State lives in the store, composed from **slices** (one file per area). Components read with selectors,
  never mutate directly, and call store actions.
- A user-visible change that supports undo calls the history action **before** mutating state.
- Components: presentational ones receive props, containers read the store. Repeated UI patterns become shared
  components in `components/common/`. One component per file once it exceeds ~150 lines.
- Effects: every effect that subscribes, listens or allocates returns its cleanup. Derived data is computed (memo
  or selector), not stored.
- Rendering engines (three.js, canvas, maps): scene/engine code stays in its own folder behind adapters; share
  geometry/resources between objects and **dispose** what you created.
- Accessibility basics are part of done: semantic elements, labels on icon buttons, dialog roles with focus
  trap and return, keyboard operation, sufficient contrast. Axe checks run in E2E for the main screens.
- User-visible strings and shortcut tables are defined once (a registry/table the UI and the help read).
- Responsive: layouts work from 320 px; a no-horizontal-overflow check exists for the main screens.

## 4. Server specifics

- Routes are thin: validate → call a service → map the result. Validation schemas live in one folder and are
  reused by every transport (REST, MCP/RPC).
- Services own I/O; filesystem access in request paths is async. Child processes use argument arrays, timeouts,
  and are killed on cancel.
- Typed errors in the core, one mapping to status codes. Error responses never leak stack traces or paths.
- Configuration through one typed module; defaults are safe (bind to localhost, small limits).

## 5. Testing – definition of done

See `docs/principles/02-testability.md`. In this stack:

1. `typecheck`, `lint`, `format:check`, `test`, `build` pass.
2. New pure logic has unit tests next to the code (`*.test.ts`). A bug fix starts with a failing test.
3. The touched E2E specs pass locally; the full suite runs in CI. An object-toolbar/sidebar/layout change always
   runs the spec that pins it.
4. No console errors in the browser on the happy path.
   A **destructive test suite** (E2E that deletes jobs, presets, files) refuses to run without an explicit target
   (`E2E_BASE_URL`, no default) and a positive fixture marker that only the fixture data carries, checked before
   the first write — one default URL would have wiped the developer's real instance.
   **E2E isolation** (needed for parallel workers): a fresh browser context per test, a per-context session or
   autosave id, and a `server-state` lock for tests that mutate shared server state (printers, uploads, settings).
   Expensive setup (a slice, an import) happens once per spec file and is memoised per worker; a fast profile is fine
   where the assertion does not depend on quality. Speeding up a suite never removes or weakens an assertion — the
   report lists test and assertion counts before/after.
   A **flaky test** is reproduced (loop the file 50×) and fixed at its cause; timing assertions are relative to a
   calibration run, not absolute milliseconds.
5. Docs: changelog "Unreleased", user docs, UAT/acceptance list when user-visible.

### Documentation and screenshots
- The main `README.md` stays short (≤ ~150 lines: what it is, a hero screenshot, grouped feature bullets with links,
  quick start, a link table into `docs/`, contributing, licence); everything else lives in `docs/` and is only linked.
- A user-visible change updates `docs/` (feature list, test-case list) and regenerates the screenshots with a script
  (`npm run docs:screenshots`) in the same task; the changelog "Unreleased" block lists it.
- UI specs select by `data-testid` hooks, not by CSS classes (a guard test enforces it for the covered regions), so
  restructuring the markup does not break the suite.

## 6. Git

See `docs/principles/05-change-management.md`: branch `feature/T-NNN`, `<Area>: <summary> (T-NNN)`,
`Co-Authored-By:` trailer, the coder never merges.

## 7. Scope discipline

Change only what the task needs; unrelated findings go to the report's Notes. Do not touch CI, Dockerfile or
deployment files unless the task says so. If a binding decision turns out wrong, stop and report.

## 8. Hand-back report

`templates/report.md`: what was done per acceptance criterion with file:line, evidence (commands + results), review
findings addressed, **Deviations** (`None.` or the real ones), notes.
