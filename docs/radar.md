# Technology radar – react-ts-vite profile

<!-- Managed by ai-dev-framework: do not edit. A project records its own holds/trials in PROJECT-CONVENTIONS.md. -->

Last reviewed: 2026-10 (framework 0.1.0). Review at least twice a year and whenever an update bot opens a major.

| Ring | Meaning | Who may use it |
|---|---|---|
| **Adopt** | the default; use it without discussion | everyone |
| **Trial** | one task, with an ADR (problem, alternatives, how to remove it) | lead decides, in the task's binding decisions |
| **Assess** | read, prototype outside the product | nobody in product code |
| **Hold** | no new use; a migration task exists for existing use | nobody for new code |

**Promotion Trial → Adopt** needs all of: maintained (release in the last 12 months), widely used or ≥ 2 major
releases, a documented migration/upgrade path, compatible licence, and a successful trial in at least one project
(two for anything that touches architecture). Promotion is a framework change: bump the version, add a migration
note to `CHANGELOG.md`, so `upgrade` tells every project.

## Adopt

| Area | Choice | Notes |
|---|---|---|
| Language | TypeScript strict | pin the major until `typescript-eslint` supports the next one (see upgrade rule below) |
| UI | React (current major) with function components and hooks | keep code compiler-ready (pure render, hooks rules as errors) |
| Build / dev server | Vite + `@vitejs/plugin-react` | update as one group |
| State | Zustand with slices | Redux Toolkit is the accepted alternative for large teams |
| Server | Node LTS, Express (current major) or Fastify | async handlers, typed errors, one error mapper |
| Validation | zod, schemas shared by every transport | types derived with `z.infer` |
| Unit tests | `node:test` (server/shared); Vitest where a DOM or Vite transform is needed | |
| E2E | Playwright (Chromium; add Firefox/WebKit when the product needs them) | sharded in CI, containerised runner |
| Lint / format | ESLint flat config + typescript-eslint (type-aware), Prettier | bulk suppressions for ratcheting |
| Architecture checks | `madge --circular`, ESLint import boundaries | `dependency-cruiser` when rules outgrow ESLint |
| Packaging | npm workspaces, one root lock file | pnpm is acceptable if the whole team uses it |
| CI | GitHub Actions, read-only `permissions`, concurrency cancel for stale runs, Dependabot grouped | |
| Containers | multi-stage Dockerfile, pinned base image, non-root | |
| 3D / canvas | three.js behind an adapter folder | |
| Docs | Markdown in repo, ADRs in `docs/adr/` | |

Notes from use: Vite 8 (rolldown) dropped unused CSS-Module sheets in the first project → plain `.css` imported in a fixed
order; the shared package stays free of runtime dependencies (hand-written validators there, zod on the server).

## Trial (candidates; each needs an ADR)

| Candidate | What to learn first |
|---|---|
| React Compiler | enable per directory; check with the profiler that nothing regressed |
| TanStack Query for server state | replaces hand-written fetch+loading state; keep the API client layer |
| Biome as formatter/linter | speed vs. type-aware lint rules we depend on; probably formatter only |
| Vitest browser mode for component tests | stability on CI; overlap with Playwright component testing |
| Renovate instead of Dependabot | grouping and schedule flexibility |
| `tsgo`/native TypeScript compiler for typecheck | speed; must produce the same diagnostics |

## Assess

Signals / fine-grained reactivity libraries, server components frameworks (Next.js/Remix) for projects that need
SSR, WebGPU in the rendering adapter, Bun as runtime, Temporal API instead of date libraries.

## Hold

| Technology | Why | Migration |
|---|---|---|
| Create React App, webpack-only setups | unmaintained | Vite |
| Class components, legacy context, `defaultProps` on function components | removed/deprecated in current React | function components |
| `enum` / `namespace` | erasable-syntax friction, bundler issues | string-literal unions, ES modules |
| Moment.js | maintenance mode | native `Intl`/`Temporal`, `date-fns` |
| Enzyme | no React 18+/19 support | Testing Library / Playwright |
| `.eslintrc` legacy configs | removed in ESLint 10 | flat config |
| `any`, `@ts-ignore` | defeats the type system | `unknown` + narrowing, `@ts-expect-error -- reason` |

## Upgrade rules (details: `playbooks/upgrade-major-dependency.md` of the framework)

- Stay on the current major or the previous one; never more than one major behind without a written reason.
- Move packages that share a peer contract together: React + types, Vite + plugin, ESLint + typescript-eslint,
  TypeScript alone (a TS major waits until `typescript-eslint` declares support).
- A held major is documented where the update bot cannot miss it (comment in `dependabot.yml`, entry here or in
  `PROJECT-CONVENTIONS.md`): *what blocks it, what unblocks it, when it is re-checked.*
