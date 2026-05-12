# N00 — API Fetch with TanStack Query + Paginated Shards — Review

**Reviewer:** Task Reviewer (AI)
**PR:** https://github.com/Slavo775/insight-flow/pull/1
**Verdict:** APPROVED

---

## Summary

Adds TanStack Query-based API fetching with shard pagination to the DataLoader. 4 source files changed (1 new). Risk: **low** — additive feature, no breaking changes to existing store consumers or components.

Previous review round requested 4 fixes (reset dataMode, nav labels, isFetch naming, fetch toast). All 4 are resolved in commit `599bd52`.

## Checklist verification
- [x] `QueryClientProvider` wraps the app in `__root.tsx` (line 74)
- [x] `src/lib/api.ts` exports `useShardIndex()` and `useShardData()` hooks (+ `useMasterData()`)
- [x] Shard index fetched from `/api/work-tasks` on load
- [x] Individual shards fetched from `/api/work-tasks/<filename>`
- [x] Highest-numbered shard displayed first (page 1) — descending sort in `select`
- [x] Prev/Next shard pagination works — `goPrev`/`goNext` with correct labels
- [x] Fetch/Upload mode toggle in DataLoader (Globe/Upload button group)
- [x] Default mode is "fetch" — `dataMode: "fetch"` in store initial state
- [x] Upload mode preserves existing file upload + paste behavior — `UploadMode` component unchanged
- [x] API base URL configurable via constant/env — `VITE_API_BASE_URL` env var with fallback

## Quality gate results
- [x] `npx tsc --noEmit` passes
- [x] `pnpm lint` passes (0 issues in changed files)
- [x] No regressions — existing store shape extended, not modified

## Notes
- `useMasterData` hook is a nice addition beyond spec — provides metadata alongside each shard.
- The `mergeFiles` utility is correctly shared between FetchMode and UploadMode.
- Toast on fetch (`data-loader.tsx:71`) will fire on every shard navigation — acceptable UX for confirming data loaded.
