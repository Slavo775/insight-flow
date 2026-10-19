# N264 — Release insight-flow 2.12.0 — dashboard facelift (N258–N263) — Checklist

## Gaps to fix (from the release check)

- [x] **BLOCKER — fix the stale test.** Updated `test/provider-dashboard.test.mjs` to assert the shipped classes (`.activity-badge-provider-cursor` + `.activity-badge-provider-other`) and renamed it "(cursor + other)"; dropped the dead `.activity-badge-provider-claude` assertion (the claude badge returns `null`). Did NOT re-add the dead CSS. Suite now 374/374.
- [x] **DOC (minor) — fix the stale tab label.** "Recent Activity" → "Status Transitions" in `website/docs/dashboard/views.md:41`. (`index.md:64` had no stale label — it's a description, left as-is.)

## Release steps

- [x] Rebuild + re-run the suite on `main` → `pnpm --dir packages/taskflow test` green (374/374) — re-check on `869bde4`
- [x] `npx tsc --noEmit` (packages/taskflow) passes; `pnpm --dir packages/taskflow run build` passes
- [x] Fixes committed + merged to `main` — via PR **#173** (`869bde4`), alongside the N265 Status-Transitions fidelity fix
- [x] **Published (human-approved).** Merged release-please PR **#172** (`6fe34db`); `v2.12.0` tag + GitHub release created; npm-publish env approved; publish workflow (`30347257998`) succeeded
- [x] Verified: `npm view insight-flow version` → **2.12.0** (`latest`); tag `v2.12.0` present

## Quality gates

- [x] `pnpm --dir packages/taskflow test` — all pass (374/374)
- [x] `npx tsc --noEmit` passes
- [x] `pnpm --dir packages/taskflow run build` passes
- [x] No new regressions

## Verification

- [x] Suite green on main after the test fix (374/374, re-check on `869bde4`)
- [x] release-please PR #172 merged → `v2.12.0` tag created + npm publish succeeded (2.12.0 = `latest`)
- [x] Docs label reads "Status Transitions"

## Also in this release (landed after the first check)

- N265 — Status Transitions pane design fidelity (PR #173, merged). Internal dashboard UI only; still feature/2.12.0, no breaking change. Tasks in 2.12.0: **N258–N265** (all done).
