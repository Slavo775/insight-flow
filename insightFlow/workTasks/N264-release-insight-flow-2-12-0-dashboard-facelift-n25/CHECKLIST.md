# N264 — Release insight-flow 2.12.0 — dashboard facelift (N258–N263) — Checklist

## Gaps to fix (from the release check)

- [x] **BLOCKER — fix the stale test.** Updated `test/provider-dashboard.test.mjs` to assert the shipped classes (`.activity-badge-provider-cursor` + `.activity-badge-provider-other`) and renamed it "(cursor + other)"; dropped the dead `.activity-badge-provider-claude` assertion (the claude badge returns `null`). Did NOT re-add the dead CSS. Suite now 374/374.
- [x] **DOC (minor) — fix the stale tab label.** "Recent Activity" → "Status Transitions" in `website/docs/dashboard/views.md:41`. (`index.md:64` had no stale label — it's a description, left as-is.)

## Release steps

- [ ] Rebuild + re-run the suite on `main` → `pnpm --dir packages/taskflow test` is green (374/374)
- [ ] `npx tsc --noEmit` (packages/taskflow) passes; `pnpm --dir packages/taskflow run build` passes
- [ ] Commit the fixes to `main` (conventional: `test:` for the test fix, `docs:` for the label) and push
- [ ] Publish 2.12.0 by merging release-please PR **#172** (`chore(main): release 2.12.0`) — tags `v2.12.0` and triggers the npm-publish workflow (env approval required)
- [ ] Verify `v2.12.0` published to npm; confirm the tag

## Quality gates

- [x] `pnpm --dir packages/taskflow test` — all pass (374/374)
- [x] `npx tsc --noEmit` passes
- [x] `pnpm --dir packages/taskflow run build` passes
- [x] No new regressions

## Verification

- [ ] Suite green on main after the test fix
- [ ] release-please PR #172 merged → `v2.12.0` tag created + npm publish succeeds
- [ ] Docs label reads "Status Transitions"
