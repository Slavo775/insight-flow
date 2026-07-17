# N248 — Redesign the master /logs page to the Lovable design (header, search, chips, colored rows)

**Type:** rework
**Priority:** medium
**Created:** 2026-07-17

## Problem

The `/logs` page (master UI, shipped in 2.9.0) is deliberately plain — its own
code comment says "Lovable styles later". We now have the real Lovable design
(project `c27ddae3`, `src/routes/logs.tsx`). We need to rework the page to match
it: a proper header, a search box, level chips with counts, and colored,
collapsible log rows.

## Goal

1. The master `/logs` page matches the Lovable design (header, search, chips,
   colored collapsible rows) using the master theme tokens (hue-260 dark).
2. Search works across **all** logs (server-side), still paginated.
3. Level chips (All / Error / Warning / Info) show **real** counts from all logs.
4. The header is a **shared** component used by both the overview and `/logs`.
5. No new npm dependency (icons are inline SVGs, not `lucide-react`).

## Scope

### In scope

- **Backend (small):**
  - `packages/taskflow/src/core/log-store.ts` — `readMerged` gains a `search`
    filter (match on `message` + stringified `data`, case-insensitive); add a
    `countByLevel(opts)` helper that counts error/warning/info across all logs
    for the active project filter.
  - `packages/taskflow/src/master/server.ts` — the `GET /api/logs` handler reads
    `?search=`, passes it to `readMerged`, and adds a `counts` object
    (`{ error, warning, info }`) to the JSON response. Pagination unchanged.
- **Client API:**
  - `packages/taskflow/src/master/client/api.ts` — `fetchLogs` sends `search`;
    the return type gains `counts`.
- **Page + components (master client):**
  - `packages/taskflow/src/master/client/LogsPage.tsx` — the full redesign.
  - `packages/taskflow/src/master/client/Header.tsx` *(new)* — shared header
    (sticky blur bar, brand block, right-side actions/search slot).
  - `packages/taskflow/src/master/client/App.tsx` — overview switches to the
    shared `Header`.
  - `packages/taskflow/src/master/client/icons.tsx` — add ~7 inline SVG icons.
  - Rework `StatusPill` tones (in `src/dashboard/client/components/StatusPill.tsx`)
    to add error/warning/info level tone sets, OR add a sibling `LEVEL_TONES`
    reusing the same `Pill` + `ToneColors` shape (implementer's call — reuse the
    existing pill, do not duplicate it).

### Out of scope

- No `lucide-react` (or any new dependency).
- No change to the log **storage** format, the `POST /log` ingestion, or the
  service worker.
- Do not edit the shared base theme (`dashboard/client/theme.ts`) or
  `GlobalStyle` — only consume tokens.
- The project dashboard UI (`src/dashboard/client/`) is not touched, except
  reworking the shared `StatusPill` tones (which stays backward compatible).

## Implementation plan

1. **Backend search + counts** (`log-store.ts`):
   - Add `search?: string` to `readMerged` opts; filter entries where
     `message` or `JSON.stringify(data)` contains the lowercased query.
   - Add `countByLevel({ project, search })` → `{ error, warning, info }`,
     counting across all logs (respecting project + search, ignoring level).
2. **API response** (`master/server.ts`, `/api/logs`):
   - Read `search` from query; pass to `readMerged`.
   - Compute `counts` via `countByLevel` and include in the JSON
     (`{ total, page, pageSize, counts, logs }`). Keep the `isTrustedLocalRequest`
     guard and pagination as-is.
3. **Client API** (`api.ts`): add `search` param to `fetchLogs`; extend the
   result type with `counts: { error: number; warning: number; info: number }`.
4. **Icons** (`icons.tsx`): add inline SVGs following the existing `Svg` wrapper:
   `ArrowLeft`, `AlertCircle`, `AlertTriangle`, `Info`, `ChevronDown`,
   `ChevronRight`, `Filter`. (`ServerIcon` already exists.)
5. **Level tones**: extend the shared pill tones with error (hue 25), warning
   (hue 85), info (hue 240) using the exact Lovable oklch values. Reuse the
   existing `Pill`/`ToneColors`; keep the server-state tones unchanged.
6. **Shared Header** (`Header.tsx` new): extract the overview's sticky blur bar +
   brand block + actions slot from `App.tsx` into a component with props
   (`eyebrow`, `title`, `brandIcon?`, `actions`/children, optional `search`).
   Point `App.tsx` at it (overview look unchanged).
7. **LogsPage redesign** (`LogsPage.tsx`): use `Header` (eyebrow "Insight Flow",
   title "Logs", a "Projects" back button linking to `/`, `SearchInput` on the
   right). Below: a filters card with level chips (All/Error/Warning/Info +
   counts, active chip uses the level tone) and the project `Select`. Then
   colored, **collapsible** rows (level tone border/bg, level icon, level badge,
   green "master" project badge, timestamp, message; expand to show the data
   JSON in a `<pre>`). Wire search + level + project + page to `fetchLogs`
   (server-side); debounce the search input.
8. **Build + verify** (see Verification).

## Verification

- `pnpm --dir packages/taskflow exec tsc -p src/master/client/tsconfig.json --noEmit`
  and the root `tsc --noEmit` pass.
- `pnpm build` succeeds (master Vite bundle builds).
- Manual: `insight-flow master`, open `http://localhost:6100/logs`:
  - header shows "Insight Flow / Logs", a "Projects" button back to `/`, and a
    working search box;
  - level chips show real counts and filter; project select filters;
  - typing in search filters across all logs (not just the current page) and
    pagination still works;
  - rows are colored by level and expand/collapse to show the data JSON.
- Overview (`/`) still looks the same after the header extraction.

## Notes

- Design source: Lovable project `c27ddae3`, `src/routes/logs.tsx`. Level colors
  must match exactly: error oklch hue 25, warning hue 85, info hue 240; "master"
  badge green hue ~150.
- Reuse-first: `SearchInput`, `Select`, `Button` (secondary), `Card` are already
  shared and theme-driven — use them, do not re-create.
- The master client is a separate Vite bundle served at `/` and `/logs`; dev with
  `pnpm --dir packages/taskflow dev:master`.
- Related: N242–N244 (the log engine), N245 (notification fix). Analyzer:
  `custom:task-fe-analyze`.
