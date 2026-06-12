# N-Dex — The Notorious Franchise Index

A full-stack Madden NFL franchise league management platform. Dark-themed (#0a0a0a bg, #00C8FF cyan, #F44336 red accent).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 / proxied to /api)
- `pnpm --filter @workspace/ndex run dev` — run the frontend (Vite dev server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI 3.1 contract (source of truth)
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks + types
- `lib/api-zod/src/generated/` — Orval-generated Zod schemas for server validation
- `lib/db/src/schema/` — Drizzle ORM schema (leagues, teams, players, games)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/ndex/src/pages/` — React pages (Home, Leagues, LeagueDetail, NewLeague, TeamDetail)
- `artifacts/ndex/src/components/` — Shared components (Navbar, LeagueCard)
- `artifacts/ndex/public/ndex-logo.png` — N-Dex logo

## Architecture decisions

- Contract-first API: OpenAPI spec drives both client hooks (React Query via Orval) and server validation (Zod schemas via Orval)
- All DB columns use camelCase in Drizzle; route handlers manually map to snake_case for the API JSON layer
- Dark theme is applied via CSS variables in index.css (`--background: 0 0% 7%` etc.) — no `.dark` class needed since the app is always dark
- Logo served from `artifacts/ndex/public/ndex-logo.png` (Vite fs.strict=true blocks serving from outside artifact root)
- Seeded with 3 leagues, 8 NFL teams (in league 1), 11 players (Eagles + Chiefs), 6 games

## Product

- Browse Madden franchise leagues with filters (platform, difficulty, category, skill level, crossplay, money league)
- View league dashboard: summary stats, top teams, recent game scores, standings table, full schedule, stat leaders by position, team roster cards
- Team detail: roster table with color-coded attribute bars (OVR, SPD, STR, AWR + position-specific)
- Create new leagues via a form that posts to the API

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Table header convention

All data tables use the team/league primary color as a solid background on the `<thead>` row, with white `font-black uppercase tracking-wider text-[10px]` column labels. Pass the color via `style={{ backgroundColor: teamColor }}` on the `<tr>`. Never use dark gray (`bg-[#0d0d0d]`) or dim text (`text-white/30`) for table headers.

## Gotchas

- Do NOT use `dark` as a Tailwind utility class in `@apply` — Tailwind v4 doesn't support applying variant names
- Orval generates `Params` types for both path params + query params in the same file, causing TS2308 collisions; workaround: remove query params from endpoints that already have path params in the OpenAPI spec
- `fs.strict: true` in Vite config means static assets must live inside the artifact directory; copy to `public/` instead of referencing `attached_assets/` via `src=`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
