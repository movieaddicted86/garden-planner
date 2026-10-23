# 01 – Architecture and modularity

## Principles

- **Single source of truth (DRY for domain knowledge).** A concept – a type, a formula, a constant, a validation
  schema, an algorithm – exists exactly once. The second copy is already one too many; "keep in sync with …"
  comments are bugs waiting to happen. (Duplicated logic between web and server was the most frequent defect
  class in the projects this framework grew out of.)
- **Single responsibility.** A module, class or function does one thing. If its description needs "and", split it.
- **Pure core, thin shell.** Domain logic (calculations, parsing, transformation, rules) is written as pure
  functions without UI framework, HTTP framework, database, clock or file system. Components, routes, store
  actions, CLI entry points and message handlers only orchestrate.
- **Composition over inheritance.** Small functions and types; inheritance only for real "is-a" hierarchies.
- **Explicit over clever.** Clear names, no hidden side effects, no magic numbers.
- **Dependencies point one way.** Higher layers know lower layers, never the reverse.

## Layers (adapt the names, keep the direction)

```
shared/ (or core/)  pure domain code and API contract types – imports nothing from the app layers
server/ services    use cases; own I/O (files, database, external processes); no HTTP types
server/ routes      HTTP only: parse + validate → call a service → map the result/error to a response
web/ state          application state, split into slices per area; no rendering code
web/ components     presentation; read state through selectors; one component per file when large
```

- **MUST** no import cycles; layers import downwards only (enforced by a boundary rule in the linter or
  `dependency-cruiser`/`madge` in CI).
- **MUST** code needed by both client and server lives in the shared package. No mirrored copies.
- **MUST** API contract types are declared once (in the shared package) and imported by both sides.
- **SHOULD** organise by feature or area first (`plater/`, `printers/`), by kind second (`hooks/`, `types.ts`).
  A newcomer navigates by folder name.
- **SHOULD** put third-party libraries behind a thin adapter when they are central (rendering engine, ORM,
  payment SDK, external CLI). Then upgrading or replacing them touches one module – this is what makes the
  upgrade paths in 05 cheap.

## Boundaries and contracts

- Validate at every trust boundary (HTTP body, message payload, file import, environment) with one schema per
  payload, defined once and reused by every transport (REST, MCP/RPC, forms).
- Errors are typed in the core (`ValidationError`, `NotFoundError`, …) and mapped to transport status codes in
  exactly one place per layer.
- Configuration comes from the environment through one typed module; nothing reads `process.env` elsewhere.
- Cross-cutting behaviour (auth, logging, rate limits, audit) lives in middleware/decorators, not inside use cases.

## Anti-patterns that cost real time

| Smell | Remedy |
|---|---|
| A 1500-line component/router/store that "everything" imports | slices / modules per area, enforced file-size limit (03) |
| UI code deciding business rules | move the rule into the pure core, test it there |
| The same helper in three packages | shared package, delete the copies in the same commit |
| A global singleton imported everywhere | pass the dependency in, or hide it behind a service |
| A feature flag per file instead of a registry | one registry (id, title, availability) that menus, shortcuts and help are generated from |
