# N226 — Fix dashboard shard-file ordering so newest tasks appear first (numeric, not lexicographic)

**Type:** fix
**Priority:** medium
**Created:** 2026-07-13

## Problem

The dashboard Tasks board paginates by shard files (`tasks-N00-N09.json` … `tasks-N200-N209.json`) stepped through with the "Newer/Older" buttons. The shard index is sorted **lexicographically by filename** in `packages/taskflow/src/dashboard/client/api.ts:16` (`.sort((a, b) => b.localeCompare(a))`). Once IDs pass N99 this text sort misorders files: `"N90"` sorts ahead of `"N200"`, so the `N90–N99` shard appears as "latest" (page 1) while the real newest tasks (N200+) get pushed many pages back. With 200+ tickets the newest work is no longer on the first page.

## Goal

1. Shard files are ordered by their **numeric** starting ID, not by filename text.
2. Highest-N shard (e.g. `tasks-N200-N209.json`) is page 1; `tasks-N00-N09.json` is the last page.
3. Ordering stays correct as IDs grow past N99 / N199 / etc.
4. A non-conforming filename never crashes the sort — it sorts predictably (deterministically last).

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/api.ts` — the `shardIndex` sort at line ~16. Replace the `localeCompare` string sort with a numeric comparator that parses the leading N-number from each `tasks-N<start>-N<end>.json` filename and sorts **descending** by `start`.
- A safe fallback for filenames that don't match the `tasks-N<num>-N<num>.json` pattern (treat as a sentinel so they sort last, no `NaN` comparison chaos).

### Out of scope

- Within-shard task order (tasks inside a page keep their current on-disk array order — do NOT sort them).
- Any change to schema, storage, the server (`server/index.ts` returns files verbatim — leave it), or task data.
- Kanban column layout / filtering logic in `ui.tsx`.
- The Timeline event sort (`ui.tsx:175`) and any other unrelated sort.

## Implementation plan

1. **Add a numeric shard-key parser** in `client/api.ts`
   - A small helper that extracts the starting number from a shard filename, e.g. `match(/^tasks-N(\d+)-N\d+\.json$/)` → `parseInt(m[1], 10)`.
   - On no match, return `-1` (or `-Infinity`) so unknown files sort last in descending order.
2. **Replace the sort comparator** at `api.ts:16`
   - Change `.sort((a, b) => b.localeCompare(a))` to `.sort((a, b) => shardKey(b) - shardKey(a))` (descending by numeric start).
3. **Keep the `startsWith("tasks-")` filter** unchanged — only the comparator changes.
4. **Manual sanity check** of the resulting order with a mixed set including 2- and 3-digit IDs (N00, N90, N100, N200).

## Verification

- `pnpm --dir packages/taskflow run build` succeeds (client `vite build` + tsc).
- With 200+ tasks, open `insight-flow ui`: the Tasks board's first page shows the newest shard (highest N, e.g. N220s), and "Older »" walks down toward `N00–N09`.
- The `N90–N99` shard no longer appears ahead of `N100+`/`N200+` shards.
- Quick unit-style check: given `["tasks-N00-N09.json","tasks-N90-N99.json","tasks-N100-N109.json","tasks-N200-N209.json"]`, sorted order is `N200-N209, N100-N109, N90-N99, N00-N09`.

## Notes

- Root cause found during `/task-analyze`: no comparator sorts individual tasks by ID; the only ID-dependent ordering is this shard **file index**, so this one line is the entire fix.
- Server (`server/index.ts:839-848`) returns filenames in `readdirSync` order; the client is the sole place ordering is applied, so the fix belongs in `api.ts`.
- `store.ts:104-109` (`sync`) defaults to the first shard in this index as the initial page — fixing the sort automatically makes the newest shard the default view.
