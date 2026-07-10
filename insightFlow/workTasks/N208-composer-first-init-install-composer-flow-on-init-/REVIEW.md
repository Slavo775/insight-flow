# N208 — Composer-first init — install composer flow on init, install-flow command, default flow opt-in — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-10
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Re-scoped N208 to its delivered part: a new `insight-flow install-flow <id>` CLI command (+ shared `installFlow()` primitive) that installs a built-in/custom flow's artifacts via `executeInstall`. 55-line, self-contained, additive change (`install-flow.ts` + `cli.ts` wiring/help). **init and create are untouched vs baseline** — the composer-first init behaviour was reverted (deferred; see the follow-up). **Approved.**

## Checklist verification

- [x] `install-flow` command: validates `<id>` against the merged flow registry (errors with known ids), calls `executeInstall(kind=flow)`, reports artifacts, idempotent. Wired in `cli.ts` + help.
- [x] init / create untouched vs baseline (composer-first reverted; no regression).
- [~] Composer-first init / create hint / docs — **deferred** to a follow-up (per-provider skills refactor).

## Verification performed

- `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **325 / 325** ✅ · typecheck ✅ · lint 0 errors.
- Manual, in a throwaway project: `install-flow composer-authoring` emits `.claude/commands/task-authoring-*` + `.mcp.json` + subagents; `install-flow default`; **unknown id errors with the known list**; re-run idempotent.
- `git diff agents-approved -- init/ create.ts` is **empty** (fully reverted).

## Blockers

- None.

## Non-blocking

1. **No automated test yet.** `installFlow` isn't in the package barrel, so a unit test needs a CLI spawn; the command is manually verified end-to-end. Add coverage in the composer-first follow-up (which will exercise `installFlow` from init anyway).

## Security & edge cases

- Validates the id before installing; `executeInstall` handles conflicts/secrets/unknown-target safely. The command installs into the current project only. No new surface.

## Notes

- Composer-first init is deferred — implementing it hit a real multi-provider blocker (shared `skills` list strips Cursor's commands; byte-identical baseline). Needs a per-provider refactor: its own follow-up task.
- `install-flow` is the reusable primitive that follow-up will call. Targets `agents-approved`.


---

## Round 2 — pending verdict

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-10
**Verdict:** pending

### Summary

### Checklist verification

### Blockers

### Non-blocking

### Security & edge cases

### Notes
