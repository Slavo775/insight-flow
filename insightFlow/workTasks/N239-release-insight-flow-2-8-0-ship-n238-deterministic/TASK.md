# N239 — Release insight-flow 2.8.0 — ship N238 deterministic status engine + hub-only notifications

**Type:** feat
**Priority:** high
**Created:** 2026-07-15

## Problem

Ship insight-flow **2.8.0**. Since `v2.7.0`, `main` carries exactly one feature — **N238** (`03f9ecb`): the deterministic status engine + hub-only notifications. release-please has already opened the release PR **#156** (`chore(main): release 2.8.0`).

## Goal

1. Publish `insight-flow@2.8.0` to npm.
2. Ship it with accurate docs (close the README notification-doc gap below first).
3. Tag `v2.8.0` and update the CHANGELOG (release-please handles both on #156 merge).
4. Release notes flag the user-facing behavior change: directly-opened project dashboards (`:6006`) no longer notify — the hub (`:6100`) is the single notifier.

## Scope

### In scope

- Merge release PR #156 (version bump + CHANGELOG + tag).
- Approve the npm-publish deployment.
- Fix the stale README notification docs (see readiness gap).

### Out of scope

- Any code change to N238 (already merged, reviewed, approved).
- Version numbers other than 2.8.0.

## Implementation plan

1. **Fix the docs gap** — rewrite `packages/taskflow/README.md:394-402` ("Tier 2 — Browser notifications (dashboard tab)") and the config-line descriptions at `:351`, `:349`, `:258` to point at the hub, matching the already-correct section at `:157`. (Handled by `task-release-fix` / release-documentation-expert.)
2. **Merge release PR #156** — bumps `package.json` → 2.8.0, updates CHANGELOG, tags `v2.8.0`.
3. **Approve npm-publish deployment** — the publish workflow gates on a deployment-environment approval (approve pending deployment). Pin `npm@^11.5.1` if Node-20 publish breaks.
4. **Verify** — `npm view insight-flow version` returns `2.8.0`.

## Verification

- Tests green on main: `pnpm --dir packages/taskflow test` → 362/362 (confirmed at check time).
- `npm view insight-flow version` → `2.8.0` after publish.
- README no longer describes project-dashboard notification popover/sounds.

## Notes

- Ships N238 only. Related: N234/N237 (prior releases), N232.
- Readiness details in this folder's `RELEASE-CHECK.md`.

## Release readiness (task-release-check, 2026-07-15)

- **Tests:** ✅ PASS — 362/362, build + typecheck clean on merged `main`.
- **Intent:** ✅ MINOR → **2.8.0** confirmed (net-new capability, backward-compatible; no CLI/config/schema/public-API break). release-please PR #156 already reflects this.
- **Docs:** 🟡 4 targeted docs correct (README hub section, `master-server.md`, `dashboard/index.md`, `dashboard/views.md`); CHANGELOG 2.8.0 pending #156 (expected). **One real gap:** `README.md:394-402` (Tier-2 "Browser notifications (dashboard tab)") plus config-line descriptions `:351`, `:349`, `:258` still describe the *removed* project-dashboard notification UI — must be fixed before publish.
- **Verdict:** READY to release once the README docs gap is fixed (non-code; `task-release-fix`).

### Re-check after fix (task-release-check, 2026-07-15)

- **Tests:** ✅ 362/362, build (incl. hub-notify) + typecheck clean on `main`.
- **Docs:** ✅ README gap closed (`dc95fdf`); re-audit found no remaining stale project-dashboard notification docs.
- **Intent:** ✅ 2.8.0 minor (release-please PR #156).
- **Verdict:** 🟢 FULLY READY TO RELEASE. No gaps remain.
