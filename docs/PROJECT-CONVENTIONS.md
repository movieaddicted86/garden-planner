# garden-planner – project conventions

Owned by the project (never overwritten). Generic rules: `docs/principles/`, `CONVENTIONS.md`,
`CODING-GUIDELINES.md` (managed by ai-dev-framework 0.1.0). This file only **adds** to them
or records a justified deviation.

## 1. The project in one paragraph

Garden Planner is a single-user, self-hosted (Docker, LAN) web app for planning a garden area in 2D and
calculating the material needed. The user draws a base area, divides it into typed zones (polygons), gives each
zone a layer build-up (material + thickness) and gets area, perimeter and a material list per zone and in total.
Projects are stored as JSON files on the server and can be exported as PNG (plan) and CSV (material list).
The product is deliberately small: its main purpose is to validate the ai-dev-framework (see `.ai/PROJECT.md`).
`shared/` holds all geometry, unit and material logic (pure TypeScript), `web/` renders the plan as SVG and keeps
state in Zustand slices, `server/` persists projects as files under `DATA_DIR`.

## 2. Layout deviations / additions

```
shared/src/
  model/       project data model (types, defaults, schemaVersion, zone types)
  geometry/    polygon area/perimeter, self-intersection, overlap, point-in-polygon, edges
  units/       m <-> cm conversion and display formatting
  materials/   layer build-up defaults, material quantities (slabs, bulk, edging)
web/src/
  plan/        SVG rendering of the plan (grid, scale, zoom/pan, zones) - plain SVG, no canvas/3D library
server/src/
  services/    project storage (JSON files under DATA_DIR)
e2e/specs/     Playwright journeys against the built app
```

Everything else follows the profile layout. PNG export serialises the SVG and rasterises it in the browser (no
library); CSV is produced by a pure function in `shared/`.

## 3. Domain rules

Every rule below is pinned by unit tests in `shared/` (the named area). A change that touches a rule updates
its test deliberately.

| #   | Rule                                                                                                                                                                                                                                            | Pinned by                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| D1  | **Internal unit is the metre** (`number`, float). Plan coordinates are metres, x to the right, y downwards (SVG orientation). cm exists only at the input/display boundary.                                                                     | `shared/src/units`               |
| D2  | **Display:** m with 2 decimals, cm with 0 decimals. Rounding happens only when formatting for display/export, never inside a calculation. The unit toggle changes display and input only, not stored values.                                    | `shared/src/units`               |
| D3  | **Polygons** are an ordered vertex list without a repeated closing vertex, at least 3 vertices. Orientation (CW/CCW) is not significant; area uses the absolute value.                                                                          | `shared/src/geometry`            |
| D4  | **Area** by the shoelace formula; **perimeter** is the sum of all edge lengths including the closing edge. Edge `i` runs from vertex `i` to vertex `(i+1) mod n`.                                                                               | `shared/src/geometry`            |
| D5  | **Self-intersection** of a polygon is detected and reported as an **error** (the zone is marked invalid, its area/material figures are not shown as valid). Shared endpoints of adjacent edges are not intersections.                           | `shared/src/geometry`            |
| D6  | **Zone overlap** (and a zone leaving the base area) is a **warning only**: no auto-clipping, figures are still computed per zone. The totals add up the zones as drawn, so overlaps count twice - the warning says so.                          | `shared/src/geometry`            |
| D7  | **Zone types:** `path`, `patio`, `bed`, `gravel`, `lawn`, `tree_pit`, `parking`. Each type has default layers; defaults are data, visible and editable per zone.                                                                                | `shared/src/model`               |
| D8  | **Slabs (plates):** area x (1 + waste); default waste 10 %. **Bulk material:** m3 = area x layer thickness; t = m3 x bulk density; default density 1.6 t/m3. **Edging:** running metres = sum of the selected edges' lengths (per-edge toggle). | `shared/src/materials`           |
| D9  | **All defaults are assumptions** (waste, density, default thicknesses, default layers). They are shown in the UI as assumptions and are editable; the stored project carries the values actually used, not references to defaults.              | `shared/src/materials`, `model`  |
| D10 | **Edge bookkeeping:** per-edge data (edging on/off) follows the geometry: inserting a vertex splits an edge (both halves inherit the flag); deleting a vertex merges two edges (the merged edge keeps the flag of the first).                   | `shared/src/geometry`            |
| D11 | **All calculations live in `shared/`**, are pure (no clock, randomness, I/O; ids are passed in) and fully unit-tested. `web/` and `server/` only call them.                                                                                     | lint boundary + review           |
| D12 | **Data model carries `schemaVersion`** (integer, from the first stored project). The server refuses to load a project with an unknown (newer) version; older versions are migrated by versioned, idempotent migration functions in `shared/`.   | `shared/src/model`, server tests |
| D13 | **Project ids** are generated by the server (UUID) and validated by a strict pattern before they touch the file system; file names are never derived from user text. Writes are atomic (temp file + rename).                                    | server tests                     |

## 3b. Specs and snapshots that pin structure

A change to one of these areas always runs the listed spec locally (a toolbar change broke the same spec twice).

| Area                                           | Pinned by                     | Run                                               |
| ---------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| App shell (page title, heading), `/api/health` | `e2e/specs/smoke.spec.ts`     | `npx playwright test e2e/specs/smoke.spec.ts`     |
| Plan view (SVG, zoom/pan/fit)                  | `e2e/specs/plan-view.spec.ts` | `npx playwright test e2e/specs/plan-view.spec.ts` |
| Base-area panel / unit toggle (form, figures)  | `e2e/specs/base-area.spec.ts` | `npx playwright test e2e/specs/base-area.spec.ts` |
| Zone drawing and list                          | `e2e/specs/zones.spec.ts`     | `npx playwright test e2e/specs/zones.spec.ts`     |

## 4. Deviations from the profile

| Rule                                    | Deviation                                                                                                                                  | Reason                                                                           | Since |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ----- |
| CI template: 3 E2E shards               | 1 shard (`1/1`) until the suite has enough specs                                                                                           | Empty shards of a 2-test suite are pointless and risk "no tests" failures        | T-000 |
| Playwright image tag in `ci.yml`        | `v1.64.1`, equal to the `@playwright/test` pin                                                                                             | The template ships `v1.50.0`; the CI step fails if tag and lock file disagree    | T-000 |
| `madge` not in `devDependencies`        | CI runs `npx madge` as in the template                                                                                                     | `madge@8` has an optional peer on TypeScript 5; the project uses TypeScript 6    | T-000 |
| Prettier ignores managed framework docs | `.prettierignore` lists `docs/principles/`, `CONVENTIONS.md`, `CODING-GUIDELINES.md`, `radar.md`, `review-checklist.md`, `eslint.base.mjs` | `npm run format` rewrites them, which makes `bootstrap upgrade` report conflicts | T-000 |

## 5. Technology holds and trials of this project

| Item                                    | Status | Blocks / unblocks                                              | Re-check            |
| --------------------------------------- | ------ | -------------------------------------------------------------- | ------------------- |
| Canvas / WebGL / 3D / drawing libraries | Hold   | 2D is plain SVG; a library needs an ADR with a measured reason | only on a real need |
| html-to-image / PNG libraries           | Hold   | SVG -> `Image` -> `canvas.toBlob` needs no library             | at M3               |
| `zod` (server validation)               | Adopt  | enters with the first persistence task (T-003)                 | -                   |

## 6. Commands

- `npm run dev` - shared build, then Vite (5173) and the server (8080) side by side.
- `npm run build && npm start` - the production setup (the server serves `web/dist` when `WEB_DIST` is set).
- `npm run build && npm run e2e` - Playwright against the built app on port 4173 with a throw-away data dir.
- `docker compose up --build` - the self-hosted image on http://localhost:8090 (data volume `garden-planner-data`).
