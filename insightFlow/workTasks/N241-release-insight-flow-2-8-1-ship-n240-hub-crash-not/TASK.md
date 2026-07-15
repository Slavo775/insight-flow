# N241 — Release insight-flow 2.8.1 — ship N240 hub crash + notification-restart fix

**Type:** fix
**Priority:** high
**Created:** 2026-07-15

## Problem

Ship insight-flow **2.8.1**. Since `v2.8.0`, `main` carries one code change — **N240** (`5066877`), two master/dashboard reliability fixes. release-please already opened the release PR **#158** (`chore(main): release 2.8.1`).

## Goal

1. Publish `insight-flow@2.8.1` to npm.
2. Tag `v2.8.1`; CHANGELOG updated (release-please handles both on #158 merge).
3. After release: run the **live notification smoke** that N240 deferred (a real `active → done` fires a "Claude finished" banner through the hub).

## Scope

### In scope

- Merge release PR #158 (version bump 2.8.0 → 2.8.1 + CHANGELOG + tag).
- Approve the npm-publish deployment (workflow_dispatch path — the release-please `workflow_call` auto-chain fails OIDC; see N239 notes).
- Roll out 2.8.1 (global + registered projects).

### Out of scope

- Any code change (N240 already merged, reviewed, approved).
- The composer publish-fix (separate, still at analysis).

## Implementation plan

1. **Merge release PR #158** → bumps `package.json` to 2.8.1, writes CHANGELOG, tags `v2.8.1`.
2. **Publish** via `gh workflow run release-publish.yml --ref main` (OIDC-safe path), then approve the `npm-publish` deployment.
3. **Verify** `npm view insight-flow version` → `2.8.1`.
4. **Rollout** — global install + registered projects.
5. **Live smoke (N240's deferred verification)** — restart the master + a project on 2.8.1, open the hub, trigger a real `active → done` and a permission prompt, confirm both banners fire.

## Verification

- `npm view insight-flow version` → `2.8.1`; `v2.8.1` tag + GitHub release exist.
- Tests green on main (363/363, confirmed at check time).
- Live: a real agent turn through the hub fires "Claude finished" / "needs permission" banners.

## Notes

- Ships N240 only. Related: N238/N239 (2.8.0), N240 (the fix).
- Readiness details below.
- **Publish gotcha (from N239):** the release-please `workflow_call` auto-chain fails npm OIDC (`ENEEDAUTH`); publish via manual `workflow_dispatch`. The composer flow fix for this is still pending.

## Release readiness (task-release-check, 2026-07-15)

- **Tests:** ✅ PASS — 363/363, build + typecheck clean on `main` (flaky `master-boot` passed this run).
- **Intent:** ✅ PATCH → **2.8.1** confirmed (two bug fixes, no CLI/config/schema/public-API change). release-please PR #158 matches.
- **Docs:** ✅ No doc update needed — pure internal reliability fix; no user-facing surface changed. CHANGELOG 2.8.1 pending #158 (expected).
- **Verdict:** 🟢 FULLY READY TO RELEASE. No gaps.
