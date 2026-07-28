# N264 — Release insight-flow 2.12.0 — dashboard facelift (N258–N263)

**Type:** chore
**Priority:** high
**Created:** 2026-07-27

## Problem

Release the dashboard facelift (N258–N263) as **insight-flow 2.12.0**. The facelift is already merged to `main` (`8d3f1d5`, PR #171). release-please has already opened the release PR **#172 "chore(main): release 2.12.0"**. But a release-readiness check found **one failing test on main** that must be fixed before publishing.

## Release readiness (from task-release-check)

**Verdict: NOT ready — 1 blocker (a stale test the facelift broke).**

- **Version / intent:** feature → **2.12.0** (minor). No breaking change — the moved files (`Header`/`SquareIconButton`/`icons` → `dashboard/client/components/`) are internal to the bundled app; `package.json` `exports` only exposes `dist/index.js`, and the public barrel (`src/index.ts`) exports nothing from the client. CLI/schema/server API unchanged.
- **Tests: FAIL (1 of 374).** `test/provider-dashboard.test.mjs:31` — "SPA ships the provider badge classes (claude + cursor)" asserts `.activity-badge-provider-claude` is in the built CSS. **Root cause:** N262's dead-CSS cleanup removed `.activity-badge-provider-claude`, which was genuinely dead — `ProviderBadge` (`ActivityItem.tsx:14`) returns `null` for `claude`, so that badge is never rendered. **The test is stale** (it asserts a class for a badge that never appears). `tsc --noEmit` and `pnpm build` both **PASS**.
- **Docs:** CHANGELOG is release-please auto-managed (entry lives on #172) — no manual edit. READMEs fine. **One real Docusaurus gap:** stale tab label "Recent Activity" → "Status Transitions" in `website/docs/dashboard/views.md` (~line 41) and `website/docs/dashboard/index.md` (line 64). No stale screenshots (all still "pending" placeholders). Optional wording polish elsewhere.

## Goal

1. Fix the failing test (root cause = the stale `.activity-badge-provider-claude` assertion; update the test to match the shipped classes — `cursor` + `other` — since the `claude` badge is intentionally never rendered).
2. Fix the one real doc gap: "Recent Activity" → "Status Transitions" in the two Docusaurus pages.
3. Get main green (test + tsc + build), then publish 2.12.0 by merging release PR #172.

## Notes

- Release PR: **#172** (release-please, `chore(main): release 2.12.0`). Merging it tags v2.12.0 + triggers npm publish (npm-publish env needs approval — see the release-publish workflow).
- The facelift PR **#171** is already merged; branch `feat/N258-dashboard-facelift` still exists (cleanup optional).
- Do NOT re-add `.activity-badge-provider-claude` — the claude badge is intentionally null (fix the test, not the code).
- Tasks in this release: N258, N259, N260, N261, N262, N263 (all done).
