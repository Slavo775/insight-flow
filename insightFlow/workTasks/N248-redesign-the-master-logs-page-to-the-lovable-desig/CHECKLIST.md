# N248 — Redesign the master /logs page to the Lovable design (header, search, chips, colored rows) — Checklist

## Subtasks

### Backend (search + counts)
- [x] `log-store.ts`: `readMerged` accepts `search?` and filters on
      `message` + stringified `data` (case-insensitive).
- [x] `log-store.ts`: add `countByLevel({ project, search })` →
      `{ error, warning, info }` across all logs.
- [x] `master/server.ts` `/api/logs`: read `?search=`, pass to `readMerged`,
      add `counts` to the response; keep pagination + trusted-local guard.

### Client data
- [x] `api.ts`: `fetchLogs` sends `search`; result type gains `counts`.

### Icons + tones (reuse-first)
- [x] `icons.tsx`: add inline SVGs — `ArrowLeft`, `AlertCircle`,
      `AlertTriangle`, `Info`, `ChevronDown`, `ChevronRight`, `Filter`.
- [x] Extend the shared pill tones with error/warning/info (oklch hues
      25/85/240, exact Lovable values) — reuse `Pill`/`ToneColors`, keep the
      existing server-state tones unchanged.

### Shared Header
- [x] New `Header.tsx`: extract the overview sticky-blur bar + brand block +
      actions/search slot (props: `eyebrow`, `title`, `brandIcon?`, actions,
      optional search).
- [x] `App.tsx`: overview uses the shared `Header` (look unchanged).

### LogsPage redesign
- [x] Header on `/logs`: eyebrow "Insight Flow", title "Logs", "Projects" back
      button → `/`, `SearchInput` (debounced) on the right.
- [x] Filters card: level chips (All/Error/Warning/Info + counts, active chip in
      the level tone) + project `Select`.
- [x] Colored rows by level (border/bg tone, level icon, level badge, green
      "master" badge, timestamp, message).
- [x] Rows are collapsible — data JSON hidden until expand (`<pre>`), with
      chevron + `aria-expanded`.
- [x] Wire search + level + project + page to `fetchLogs` (server-side).

## Quality gates
- [x] `tsc --noEmit` (root) + `tsc -p src/master/client/tsconfig.json --noEmit` pass
- [x] `pnpm build` succeeds (master Vite bundle)
- [x] Existing `node:test` suite still passes (log-store / server tests)
- [x] No regression on the overview page after header extraction

## Verification
- [x] `insight-flow master` → `http://localhost:6100/logs`: header, search,
      chips-with-counts, project filter, colored collapsible rows all work.
- [x] Search filters across all logs (not only the current page); pagination works.
- [x] Overview (`/`) looks the same as before.
