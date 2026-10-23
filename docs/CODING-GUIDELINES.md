# Coding guidelines – React + TypeScript + Vite profile (architecture and clean code)

<!-- Managed by ai-dev-framework (profile react-ts-vite): do not edit. Project additions: PROJECT-CONVENTIONS.md. -->

Binding, together with `CONVENTIONS.md` and `docs/principles/`. Rules marked **MUST** are review blockers and,
where a tool can check them, CI gates (`docs/principles/06-enforcement.md`).

## 1. Folder layout

```
shared/src/        pure, dependency-free TypeScript used by web AND server
  types/           API contract types (declared once)
  <area>/          domain algorithms (math, packing, parsing, diffing, …) – no React, Express, DOM, fs
server/src/
  routes/          HTTP only: parse + validate input, call services, map errors → status codes
  services/        use cases; own the I/O; no Express types
  <integration>/   external systems (CLI, database, third-party API) behind one module each
  validation/      zod schemas, shared by REST and RPC/MCP
web/src/
  api/             HTTP client per resource, no state
  state/           store composed from slices (state/slices/<area>.ts)
  <engine>/        rendering/engine code (three.js, canvas) behind adapters
  components/      React UI; components/common/ for shared patterns
  hooks/           reusable hooks (single-use hooks live next to their component)
  tools/ (opt.)    registry of tools/commands: id, title, icon, shortcut, availability → menus, help, shortcuts
```

- **MUST** dependencies point down: `components → state → shared/api`; `routes → services → integrations/shared`.
  No import cycles. `shared` imports nothing from `web` or `server`.
- **MUST** code used by both sides lives in `shared/`; contract types are declared there once and re-exported.
- Engine types (three.js `Matrix4`, map objects) stay in the engine folder and thin adapters; shared maths works on
  plain arrays/tuples.

## 2. Types

- **MUST** a type is declared once, next to its owner (or in `shared/types` if it crosses the API).
- Build hierarchies with `extends` and utility types (`Pick`, `Omit`, `Partial`, `Readonly`) instead of repeating fields.
- Discriminated unions for variants, not optional-field soup: `{ kind: 'stl' } | { kind: '3mf'; … }`.
- `interface` for object shapes, `type` for unions, tuples, mapped types. No `any`; avoid `!` where a guard is cheap.
- Meaningful constants live in one `constants.ts` per area and are imported, never retyped.
- Derive request/patch types from the entity type; derive types from zod schemas (`z.infer`) so schema and type
  cannot drift.

## 3. Functions and files (lint-enforced limits)

| Rule | Value | ESLint |
|---|---|---|
| File length | warn 300 / error 400 (tests excluded) | `max-lines` |
| Function length | warn 40 / error 80 | `max-lines-per-function` |
| Parameters | error > 5 (options object) | `max-params` |
| Nesting | error > 4 | `max-depth` |
| Complexity | warn 10 / error 15 | `complexity` |
| Component length | warn 150 / error 250 lines | `max-lines-per-function` (tsx override) |

Existing code above a limit is recorded with ESLint's bulk suppressions (`eslint --suppress-all` →
`eslint-suppressions.json`, ratchet, see principles 06): new violations fail, `eslint --prune-suppressions`
shrinks the file as code is cleaned up. Names: verbs for functions, nouns for data, `is/has/can` for booleans.

## 4. Web

- **Store slices.** `store.ts` composes slice creators (`createXSlice`) into one `useStore`. Slices call pure
  functions from `shared/` for all calculations and contain no engine code.
- **Selectors.** `useStore((s) => s.objects)`; avoid selecting new objects/arrays per render (use shallow
  equality or derive in a memo).
- **Components.** Presentational vs. container. Repeated UI patterns → shared components. Forms: controlled
  inputs with validation from the shared schema. Lists have stable keys.
- **Hooks.** `use…` prefix; effects clean up after themselves; no data fetching in components without the API
  layer; long-lived resources (workers, listeners, engine contexts) are owned by one hook with a cleanup.
- **Large views** (a viewer, an editor) are compositions of hooks/modules (`useScene`, `useSelection`,
  `useGizmo`, `useKeyboardShortcuts`), not one file. Shortcuts: one table read by the handler and the help.
- **Tool/command registry.** Features that appear in a toolbar, a shortcut list and the help dialog are one
  registry entry; adding a feature adds no button, shortcut or help line by hand.
- **Performance.** Measure before optimising; code-split heavy routes/engines; virtualise long lists; keep the
  main bundle budget in CI (warn on growth).
- **React Compiler readiness.** Components are pure, hooks follow the rules (`react-hooks` lint as error), no
  mutation of props/state during render, so the compiler can be enabled later without a rewrite.

## 5. Server

- Routes stay thin; validation schemas defined once and shared by REST and RPC/MCP.
- Services own I/O (files, database, child processes); pure transforms (parsers, writers) take buffers/objects
  and return buffers/objects.
- Async everywhere in request paths; no sync fs calls on a request. Cancellation and timeouts are first-class for
  jobs and child processes.
- Error mapping in one place per layer; a typed error has an HTTP status in the mapper, never in the service.

## 6. Refactoring rules

- Refactoring never changes behaviour: tests pin the behaviour **before** code moves; all green after each step.
- One concern per commit; delete dead code and duplicate helpers in the same commit that introduces the shared version.
- If a rule here does not fit a case, document the exception in the commit body – do not deviate silently.
