# N252 — Release insight-flow 2.11.0 — ship N251 update-available toast + insight-flow update CLI

**Type:** feat
**Priority:** medium
**Created:** 2026-07-18

## Problem

N251 (update-available toast in the master hub + `insight-flow update` CLI) is reviewed, approved, committed, and pushed on `feat/N251-update-available-toast`, but it is not released. We need to cut and publish **insight-flow 2.11.0** so users get the feature. The release check found the code green but the Docusaurus docs incomplete, so docs must be closed before publish.

## Goal

1. Publish **insight-flow 2.11.0** (minor bump from 2.10.0 — additive feature, no breaking changes).
2. Close the four Docusaurus doc gaps for N251 before release.
3. Merge N251 into `main` so release-please prepares the 2.11.0 bump/changelog PR.
4. Verify the published package on npm and that release notes mention the new default outbound npm check.

## Scope

### In scope

- **Docs fixes** (task-release-fix): `website/docs/cli/setup-and-dashboard.md`, `website/docs/built-ins/master-server.md`, `website/docs/configuration.md`, `website/docs/cli/index.md` — document the `update` command, `updateCheck` config, `GET /api/version` endpoint, and the update toast.
- **Merge**: N251 PR → `main` (triggers release-please).
- **Release-please**: 2.10.0 → 2.11.0 bump PR + CHANGELOG (auto).
- **Publish**: npm publish of 2.11.0 (gated — human approval).

### Out of scope

- Any code change to N251's feature (it is approved and frozen). Docs only.
- Bumping downstream projects' local dependency (that is `/task-release-rollout`, separate).
- Touching `website/versioned_docs/version-2.0/` (frozen 2.0 snapshot).

## Implementation plan

1. **Fix Docusaurus docs** (`/task-release-fix`) — see the four checklist gaps below.
2. **Re-verify** — docs build/links OK; tests still 369/369; `tsc` clean.
3. **Set `ready-to-release`** once docs are closed.
4. **Merge N251** (`/task-release-merge`) — merge the approved feature PR into `main`; release-please opens the 2.11.0 bump PR.
5. **Publish** (`/task-release-ship`, gated) — merge the release-please PR; the npm-publish workflow ships 2.11.0 (approve the pending deployment).
6. **Verify + close** — confirm `npm view insight-flow version` = 2.11.0, then mark done.

## Verification

- `npm view insight-flow version` returns `2.11.0` after publish.
- Docusaurus docs show the `update` command, `updateCheck` config, and `GET /api/version` endpoint; `configuration.md` `master.json` shape includes `updateCheck`.
- Release notes / CHANGELOG mention the new default outbound npm-registry check on hub load (throttled 12h, disableable).
- Tests remain 369/369; `tsc --noEmit` clean.

## Notes

- **Release check (N252, release-checked, 2026-07-18):** tests 369/369 ✅, `tsc` ✅; intent = **feature → 2.11.0**, no breaking changes; README ✅, CHANGELOG auto (release-please); **Docusaurus incomplete** → entered `changes-needed`.
- **Re-check after docs fix (2026-07-18):** all green — tests 369/369, `tsc` ✅, Docusaurus 4 gaps closed and re-audited → `ready-to-release`. Doc edits still uncommitted on `feat/N251-update-available-toast` (commit via `/task-git` before/at merge).
- **N251 must land as a `feat:` commit on `main`** for release-please to bump to 2.11.0 (it already is: `feat(master): update-available toast + insight-flow update CLI (N251)`, `d73acd5`).
- Release-note flag: hub now makes a default outbound npm call on load — throttled 12h, cached, disableable via `updateCheck.enabled: false`.
- Related: N251 (the feature), N249 (last release, 2.10.0), N250 (OIDC auto-publish CI fix). Publish env needs manual approval (see release/publish workflow).
