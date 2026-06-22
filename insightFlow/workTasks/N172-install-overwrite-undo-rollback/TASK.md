# N172 — Install overwrite undo/rollback

**Type:** feat
**Priority:** low
**Created:** 2026-06-22

## Problem

N165's overwrite (force) path replaces a differing `.mcp.json` server config, with no in-app undo to restore the prior config. Speculative / low value: `.mcp.json` is gitignored and recoverable via git, and the secrets store retains prior values — recovery already exists out-of-band.

## Goal

1. Capture the prior definition before an overwrite.
2. Offer a one-click "undo" to restore the captured prior `.mcp.json` server entry shortly after.

## Scope

### In scope

- `dashboard/client/components/InstallModal.tsx` — after an overwrite, show an "Undo" using the `conflict.installed` snapshot the response already carries.
- A server affordance to write back the prior entry (entry-level restore).

### Out of scope

- Persisted backup files / overwrite history (over-engineering — git already covers it).
- Anything beyond the single most-recent overwrite.

## Implementation plan

1. **Decide if worth building** — `.mcp.json` is gitignored + git history covers recovery; only proceed if the in-app undo is genuinely wanted (strategist: likely defer).
2. **Snapshot** — keep the pre-overwrite `installed` entry (already in `InstallConflictError.conflict.installed`) available to the client post-overwrite.
3. **Undo action** — an "Undo overwrite" button that POSTs a restore of the prior entry into `.mcp.json` (entry-level).
4. **Tests** — overwrite then undo restores the prior config.

## Verification

- Overwrite a differing config, click Undo → `.mcp.json` server entry matches the pre-overwrite value.
- `pnpm --dir packages/taskflow test` passes.

## Notes

- **Speculative / low priority** — strategist flagged that git + gitignored `.mcp.json` already provide recovery. Build only if the in-app affordance is wanted. Related: N165 (overwrite/diff).
