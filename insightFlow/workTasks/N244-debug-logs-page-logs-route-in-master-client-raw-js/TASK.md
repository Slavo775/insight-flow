# N244 — Debug logs page — /logs route in master client (raw JSON, project/type filter, pagination)

**Type:** feat
**Priority:** medium
**Created:** 2026-07-16

## Problem

The log engine (N242) and instrumentation (N243) fill `~/.insight-flow/logs/`, but there's no way to look at them in the hub. Add a **`/logs` page** to the existing master React client that reads `GET /logs` and shows the raw JSON, filterable by project + type, paginated. Raw first; Lovable can style it later.

## Goal

1. A `/logs` route in the master client that fetches `GET /logs` and renders the entries.
2. Filters: project (name / master / all) + type (error / warning / info / all).
3. Pagination (page + page size) using the API's paging.
4. Raw-JSON friendly — each entry shows type, timestamp, projectName, message, and the `data` blob (pretty-printed).

## Scope

### In scope

- **`src/master/client/`** — a new `LogsPage` component + a `/logs` route (the master client uses its own router/nav — follow the existing pattern for `/overview` etc.). Fetch `GET /logs?project=&type=&page=&pageSize=`.
- Minimal UI: a project dropdown (from the API's project list or `GET /api/hub/projects`), a type filter, prev/next paging, and a list where each row shows the entry with the `data` field as pretty JSON (`<pre>`). Colour by type (error/warning/info) — reuse existing theme tokens.
- A nav link to `/logs` in the master header.

### Out of scope

- The engine + endpoints (N242) and instrumentation (N243) — dependencies.
- Fancy styling / charts — raw JSON view is the deliverable (Lovable handles polish later).
- Auth beyond the existing same-origin gate.

## Implementation plan

1. **Route + nav.** Add `/logs` to the master client router and a header link, mirroring the existing routes (`/overview`, settings, etc.).
2. **Data hook.** `useLogs({project, type, page, pageSize})` → `fetch(GET /logs?…)` → `{ total, page, pageSize, logs }`. Handle loading/error/empty.
3. **Filters.** Project select (default `all`; options from `GET /api/hub/projects` names + `master`), type select (default `all`), page controls.
4. **Row render.** Per entry: type badge, timestamp, projectName, message, and `<pre>` of `JSON.stringify(data, null, 2)`. Newest first (API already sorts).
5. **Build wiring.** Ensure the new page is in the master vite build; the master server already serves the client bundle.
6. **Test/verify.** The page loads, filters change the query, paging works; a smoke check against seeded logs.

## Verification

- Navigate to `http://localhost:6100/logs` → recent logs render (newest first).
- Switch project / type filters → the list updates via the API query.
- Paging → prev/next fetch the right slices.
- After N243 instrumentation is live, a real error shows up on the page.
- `pnpm --dir packages/taskflow build` + typecheck + lint clean.

## Notes

- Depends on **N242** (GET /logs) and is most useful after **N243** (real logs flowing).
- Master client is React + Vite (`src/master/client`), built by `vite build --config vite.master.config.ts`, served by the master server.
- Raw JSON is intentional — the user styles the page in Lovable afterward; keep the markup simple + data-complete.
