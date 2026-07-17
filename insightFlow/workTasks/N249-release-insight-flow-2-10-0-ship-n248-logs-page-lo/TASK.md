# N249 — Release insight-flow 2.10.0 — ship N248 logs page Lovable redesign + search/counts

**Type:** feat
**Priority:** medium
**Created:** 2026-07-17

## Problem

N248 redesigned the master `/logs` page to the Lovable design and added
server-side search + per-level counts to `/api/logs`. It is reviewed (6 rounds,
approved) and open as PR #163. It needs to ship. One gap: the `debug-logs.md`
guide (from 2.9.0) does not yet document the new `search` param / `counts` /
redesigned UI.

## Goal

1. Ship N248 as insight-flow **2.10.0** (minor).
2. Update the debug-logs guide so the docs match the shipped feature.
3. Roll the new version to the global binary + bulk-registered projects.

## Scope

### In scope

- Close the docs gap in `website/docs/guides/debug-logs.md` (search param,
  counts response, redesigned `/logs` UI) — commit into PR #163.
- Merge PR #163 → `main`; run release-please (2.9.0 → 2.10.0); publish to npm;
  roll out.

### Out of scope

- No code change (N248 is done and approved). Docs-only fix here.

## Implementation plan

1. **Docs fix** (Release Implementer) — update `debug-logs.md`: add `search` to
   the `/api/logs` params table, add `counts` to the response, and refresh the
   "Reading the logs" section for the new search box + level chips. Commit to the
   `feat/N248-…` branch (PR #163).
2. **Re-check** — confirm docs complete; set `ready-to-release`.
3. **Merge** — Release Merger merges PR #163 into `main` (triggers release-please).
4. **Publish (gated)** — human go-ahead → merge the `chore(main): release 2.10.0`
   PR (tags `v2.10.0`), approve the npm-publish deployment.
5. **Verify + rollout** — `npm view insight-flow version` == 2.10.0; global +
   registered projects.

## Verification

- `npm view insight-flow version` returns `2.10.0`.
- `http://localhost:6100/logs`: search + chips + counts + collapsible rows work.
- The debug-logs guide documents `search` + `counts`.

## Notes

- Release-check: tests 369/369, feature intent, one docs gap (this task).
- Known publish gotcha (2.8.x/2.9.0): release-please `workflow_call` fails OIDC
  (ENEEDAUTH) → publish manually via `gh workflow run release-publish.yml
  --ref main` + approve the pending deployment. npm pinned `^11.5.1`.
