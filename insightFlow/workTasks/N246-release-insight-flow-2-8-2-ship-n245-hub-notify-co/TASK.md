# N246 — Release insight-flow 2.8.2 — ship N245 hub-notify comment-injection fix

**Type:** fix
**Priority:** high
**Created:** 2026-07-16

## Problem

N245 fixes the true root cause of hub browser notifications never firing:
`/hub-notify.js` was injected into an HTML comment (the `html.replace("</body>")`
matched the comment's literal `</body>`), so the script never executed. The fix
is reviewed (AI + human, approved) and open as PR #160. It needs to reach users.

## Goal

1. Ship the N245 fix as insight-flow **2.8.2** (patch).
2. Restore working hub notifications + sounds for all installs.
3. Roll the new version to the global binary and bulk-registered projects.

## Scope

### In scope

- Merge PR #160 → `main`; run release-please (2.8.1 → 2.8.2); publish to npm.
- Rollout to global install + registered projects.

### Out of scope

- The 2.9.0 log engine (N242–N244, PR #159) — a separate release.
- Any code change (this is a release task; the fix is done in N245).

## Implementation plan

1. **Merge** — Release Merger merges PR #160 into `main` (triggers release-please).
2. **Release PR** — confirm release-please opens `chore(main): release 2.8.2`.
3. **Publish (gated)** — human go-ahead → Publisher merges the release PR (tags
   `v2.8.2`) and approves the npm-publish deployment.
4. **Verify** — `npm view insight-flow version` == 2.8.2; tag + GitHub release.
5. **Rollout** — global `npm i -g insight-flow@2.8.2` + bulk-registered projects.

## Verification

- `npm view insight-flow version` returns `2.8.2`.
- Live smoke: hub open, agent `done` → browser notification fires unaided.

## Notes

- Release-check: all green (tests 363/363, bugfix intent, no doc gaps).
- Known publish gotcha (from 2.8.0/2.8.1): the release-please `workflow_call`
  auto-chain fails OIDC (ENEEDAUTH). If it does again, publish manually via
  `gh workflow run release-publish.yml --ref main` and approve the pending
  deployment. Also pin `npm@^11.5.1` (npm@latest v12 breaks Node 20 publish).
