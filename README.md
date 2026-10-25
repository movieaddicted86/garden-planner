# garden-planner

2D planner for a garden area with material calculation. Single user, LAN, self-hosted (Docker).

You draw a base area and divide it into typed zones (path, patio, bed, gravel, lawn, tree pit, parking). Each
zone gets a layer build-up; the app shows area and perimeter live and calculates the material list per zone
and in total (slabs incl. waste, bulk material in m3 and tonnes, edging in running metres). Projects are saved
as JSON on the server; the plan exports as PNG and the material list as CSV.

> Status: skeleton. The plan view is visible: the demo 10 m × 6 m base area is drawn as SVG on a metre grid with a
> scale bar, and can be zoomed (mouse wheel), panned (drag) and fitted (the "Fit" button). The MVP scope and the order
> of work are in the roadmap; the acceptance test is
> [docs/UAT.md](docs/UAT.md). This project is also the second validation of
> [ai-dev-framework](https://github.com/movieaddicted86/ai-dev-framework).

## Stack

npm workspaces `shared/` (pure TypeScript: geometry, units, materials), `server/` (Express, projects as JSON
files under `DATA_DIR`), `web/` (React, Zustand, Vite, plain SVG). Node 22, TypeScript strict.

## Development

```bash
npm ci
npm run dev          # Vite on :5173, API on :8080
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
npm run e2e          # needs a build; Playwright (Chromium)
```

## Run with Docker

```bash
docker compose up --build    # http://localhost:8090, data in the volume garden-planner-data
```

Configuration (environment): `PORT` (default 8080), `DATA_DIR` (default `/data`), `WEB_DIST` (built web app,
set in the image).

## Conventions

[docs/PROJECT-CONVENTIONS.md](docs/PROJECT-CONVENTIONS.md) (domain rules), [docs/CONVENTIONS.md](docs/CONVENTIONS.md)
and [docs/CODING-GUIDELINES.md](docs/CODING-GUIDELINES.md) (framework).
