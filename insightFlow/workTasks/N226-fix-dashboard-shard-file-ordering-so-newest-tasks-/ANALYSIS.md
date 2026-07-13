# N226 — Analysis (Pre-Taskmaster)

## Problem framing

User reports: with 200+ tickets, the dashboard Tasks view no longer shows the latest tasks first. The last page holds N99-range tasks and ~N200 sits around page 10. They want the newest tasks on the first page.

Investigation showed the Tasks view is a **kanban board paginated by shard files**, not a sortable table. No comparator ever sorts individual tasks by ID. The only ID-dependent ordering is the **shard file index**, sorted lexicographically at `packages/taskflow/src/dashboard/client/api.ts:16`:

```ts
.sort((a, b) => b.localeCompare(a))
```

Lexicographic order breaks past N99: as text, `"N90"` > `"N200"` (char `9` > `2`), so the `N90–N99` shard jumps ahead of the real newest `N200+` shards. That is the entire root cause — a one-line bug that never anticipated 3-digit IDs.

## Goal

Order shard files by their numeric starting ID (descending) so the highest-N shard is page 1, and it stays correct as IDs pass N99 / N199.

## Options considered

1. **Fix file (shard) order by number only** — parse the leading N-number, sort descending. Smallest, safest, fixes the reported symptom exactly. **Chosen.**
2. **File order + newest task on top within each page** — also sort tasks inside a shard. More work; not requested.
3. **Order by real activity date (`updatedAt`)** — different meaning of "latest"; changes semantics. Not requested.

## Decision

Option 1, confirmed by the user. Limit change to the `shardIndex` sort in `client/api.ts`; parse the numeric start from `tasks-N<start>-N<end>.json`, sort descending, with a safe fallback (sentinel) for non-conforming filenames. Do not touch within-shard order, server, schema, or data.

## Open questions

- None. Scope and meaning of "latest" confirmed with the user before handoff.

## Sources

- `packages/taskflow/src/dashboard/client/api.ts:16` — the buggy `localeCompare` shard sort.
- `packages/taskflow/src/dashboard/client/store.ts:87-109` — `loadShard` / `sync` default to first shard in the index.
- `packages/taskflow/src/dashboard/client/ui.tsx:127,236-264` — Kanban render (no task sort) + `ShardNav` Newer/Older.
- `packages/taskflow/src/dashboard/server/index.ts:839-848` — server returns filenames in `readdirSync` order (unsorted); client is the sole ordering point.

## Handoff brief

Type `fix`, priority `medium`, tags `dashboard,pagination,bug`. Replace the `localeCompare` shard-index sort with a numeric-descending comparator keyed on the leading N-number, plus a safe fallback for odd filenames. One-file change in `client/api.ts`; verify newest shard is page 1 and the given sample list orders as `N200-N209, N100-N109, N90-N99, N00-N09`.
