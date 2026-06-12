# N00 — API Fetch with TanStack Query + Paginated Shards

**Type:** feat
**Priority:** high
**Created:** 2026-05-12

## Problem

- The dashboard currently only supports manual file upload or paste to load task data. There's a local API at `http://localhost:3033/api/work-tasks` that serves a file index and individual JSON files, but the app doesn't use it.
- Users want auto-fetch on load with shard-based pagination (one shard = one page, newest first).

## Goal

1. Wire up TanStack Query (`@tanstack/react-query`, already installed) with a `QueryClientProvider`.
2. Fetch the file index from `/api/work-tasks` → returns `["master.json", "tasks-N00-N09.json", ...]`.
3. Fetch each shard file from `/api/work-tasks/<filename>` and merge into the Zustand store.
4. Add paginated shard navigation — each shard is one page, highest-numbered shard is page 1.
5. Let users toggle between "Fetch from API" (default) and "Upload JSON files" modes.
6. Auto-fetch on initial load when in fetch mode.

## Scope

### In scope

- `src/routes/__root.tsx` — wrap with `QueryClientProvider`.
- `src/lib/api.ts` (new) — TanStack Query hooks: `useShardIndex()`, `useShardData(filename)`.
- `src/components/viz/data-loader.tsx` — add fetch mode toggle, shard pagination controls, keep existing upload/paste as fallback.
- `src/lib/task-store.ts` — add `currentShard` state, `setShardTasks()` action to load one shard at a time.
- API base URL should be configurable (env var or constant), default `http://localhost:3033`.

### Out of scope

- Server-side changes (the API already exists).
- Modifying chart/kanban components — they consume from the store as-is.
- Authentication or CORS configuration.

## Implementation plan

1. **QueryClientProvider setup** — Add `QueryClient` + `QueryClientProvider` in `src/routes/__root.tsx`.
2. **API hooks** (`src/lib/api.ts`) — `useShardIndex()` fetches `/api/work-tasks`, returns sorted shard list (descending). `useShardData(filename)` fetches `/api/work-tasks/<filename>`, returns parsed JSON.
3. **Store updates** (`src/lib/task-store.ts`) — Add `currentShard: string | null`, `shardList: string[]`, `dataMode: "fetch" | "upload"` fields. Add `setShardTasks(tasks, meta, shardName)` and `setShardList(list)` actions.
4. **DataLoader refactor** (`src/components/viz/data-loader.tsx`) — Add a toggle (fetch / upload). In fetch mode: auto-run `useShardIndex()` on mount, default to highest shard, show prev/next shard buttons. In upload mode: keep current file input + paste UI.
5. **Shard pagination** — Display "Shard N20-N29 (1/3)" style indicator. Prev/Next buttons load adjacent shards via `useShardData()`. Master.json is fetched alongside every shard for metadata.
6. **Auto-fetch on load** — When `dataMode === "fetch"`, trigger index + first shard fetch immediately (TanStack Query `enabled: true` by default).

## Verification

- `pnpm build` succeeds.
- Dev server: on load, dashboard auto-fetches from API and displays tasks from highest shard.
- Shard pagination navigates between shards correctly.
- Toggling to upload mode restores manual file upload behavior.
- `npx tsc --noEmit` passes.

## Notes

- `@tanstack/react-query` v5.83.0 is already in `package.json`.
- The existing `mergeFiles()` utility in `data-loader.tsx` can be reused for combining master + shard data.
- API response format: index returns `string[]`, each file returns the same JSON structure the upload handler expects.
