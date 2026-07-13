# N226 — Fix dashboard shard-file ordering so newest tasks appear first (numeric, not lexicographic) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-13
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Single-file, 13-line fix in `packages/taskflow/src/dashboard/client/api.ts`. Adds a pure `shardStart(name)` helper that parses the leading N-number from a shard filename and swaps the shard-index comparator from lexicographic (`b.localeCompare(a)`) to numeric-descending (`shardStart(b) - shardStart(a)`). Correctly fixes the reported N99-vs-N200 mis-ordering. **Risk: low** — pure function, no I/O, no schema/server/data change, scope exactly as specified.

## Checklist verification

- [x] `client/api.ts` shard index sorts by numeric starting ID, not `localeCompare` — pass (`api.ts:26`)
- [x] Highest-N shard first; `N00-N09` last — pass (descending on parsed start; verified against all 23 on-disk shards → `N220-N229 … N00-N09`)
- [x] Non-matching filenames sort predictably (last), no `NaN`/crash — pass (regex-miss returns `-1`, the min key, so it lands last under descending; no `parseInt(NaN)` path)
- [x] Within-shard task order unchanged; server/schema/data untouched — pass (only the file index comparator changed)
- [x] Sample `[N00,N90,N100,N200]` → `N200,N100,N90,N00` — pass (re-verified in review)
- [x] Build (`tsc`+`vite`) passes; eslint clean — pass (run at implement time)

## Non-blocking

- The helper's regex `^tasks-N(\d+)-N\d+\.json$` matches the server's own `^tasks-N\d+-N\d+\.json$` (`server/index.ts:866`) — good that the two agree. If that naming ever changes, both sites must move together; not worth abstracting for one call site now.

## Security & edge cases

- No security surface (read-only client sort of server-provided filenames).
- Ties (two shards with equal start) are impossible for disjoint ranges; if they occurred, the stable sort preserves input order — harmless.
- `master.json` and any non-`tasks-` file are already excluded by the pre-existing `startsWith("tasks-")` filter.

## Notes

- Root cause and scope confirmed during `/task-analyze` (see ANALYSIS.md); the fix matches the agreed "file order by number only" option.
- Fix already applied to the user's global install locally (npm-packed + `install -g`); durable rollout still needs the git → release path (N226 not yet pushed/merged).


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-13
**Verdict:** approved

> "approved please create base branch fixes and merge it there thanks"

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

- Merge instruction: create a base branch `fixes` and merge N226 into it (target `fixes`, not `main`). To be carried out in the `/task-git` step.
