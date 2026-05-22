# N00 — API Fetch with TanStack Query + Paginated Shards — Checklist

## Done criteria

- [ ] `QueryClientProvider` wraps the app in `__root.tsx`
- [ ] `src/lib/api.ts` exports `useShardIndex()` and `useShardData()` hooks
- [ ] Shard index fetched from `/api/work-tasks` on load
- [ ] Individual shards fetched from `/api/work-tasks/<filename>`
- [ ] Highest-numbered shard displayed first (page 1)
- [ ] Prev/Next shard pagination works
- [ ] Fetch/Upload mode toggle in DataLoader
- [ ] Default mode is "fetch" — auto-loads on mount
- [ ] Upload mode preserves existing file upload + paste behavior
- [ ] API base URL configurable via constant/env

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] No regressions in dashboard rendering
- [ ] Build succeeds (`pnpm build`)

## Verification

- [ ] Open dev server → dashboard auto-fetches and displays tasks from highest shard
- [ ] Click Next/Prev → loads adjacent shard, dashboard updates
- [ ] Toggle to Upload mode → file picker works as before
- [ ] Toggle back to Fetch → re-fetches from API
- [ ] Network tab shows correct API calls to `/api/work-tasks` and `/api/work-tasks/<file>`
