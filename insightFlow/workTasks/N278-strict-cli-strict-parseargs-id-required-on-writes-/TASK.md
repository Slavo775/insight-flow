# N278 — Strict CLI — strict parseArgs, --id required on writes, status transition table, friendly errors

**Type:** fix
**Priority:** high
**Created:** 2026-10-19

## Problem

The CLI's hand-rolled argument parser accepts anything, and the global `currentTaskId` fills in when `--id` is missing. Agents therefore change the wrong task without noticing:

- `--id=N05` mutates the current task instead of N05.
- `show N252` shows the current task.
- `merge --help` merges the current task, and `update --help` runs `npm i -g`.
- Bare flags turn into `true` and crash later.

`currentTaskId` is shared by every parallel agent. Status changes only check that the target status exists in the flow, so `review-end --verdict merged` and `push` on a merged task are accepted. `status` bypasses even that. Review side files are saved before validation. Common errors print raw stack traces into agent context. There are also smaller defects: a `$` in a title corrupts scaffolds, the two open-incident rules disagree, helpers are duplicated, `cli/commands` code is imported by the dashboard and agents, and `bulk-*` commands crash on Windows. Source: `N271/AUDIT.md` **A11, A12, A72, A74, A76, A81** (batch-ui part).

## Goal

1. Unknown flags, malformed values and stray positional args are errors (exit 2). `--help` never executes a command.
2. Every state-changing command requires `--id`; only read commands keep the current-task fallback.
3. Status changes follow one allowed-transition table in core. Invalid ones fail before anything is written.
4. User errors print `error: <message>` (no stack) and exit non-zero.
5. Duplicate helpers live in core once, and the listed smaller defects are fixed.

## Scope

### In scope

- `packages/taskflow/src/cli/cli.ts` — `parseArgs` (~:78-95), help text, dispatch, top-level catch (~:485-495), `update` (:251).
- `packages/taskflow/src/cli/commands/*.ts` — option consumption; `review.ts` (~:80-93); `fix.ts` (~:20, :60-62); `status.ts` (:15-16); `push.ts` (:30); `implement.ts` (:40); `batch-ui.ts` (:129, :235, :365, :448); `chain-advance.ts` (:100-101); `show.ts` (:19-22); `query.ts`, `change.ts`, `incident.ts`, `create.ts` (helper dedupe).
- `packages/taskflow/src/core/set-status.ts`, a new core transitions table, `core/storage.ts` (`resolveId`, incident rule ~:206), `core/spec.ts` (:11).
- `packages/taskflow/src/core/storage-port.ts` (delete or route; see step 8).
- `packages/taskflow/src/dashboard/server/index.ts` (:23) and `packages/taskflow/src/agents/init/index.ts` (:22-23) — import moved helpers from core.
- Role prompt sources (`src/agents/modules/*.json` → re-compose) only if a documented command omits `--id`.
- Tests.

### Out of scope

- Storage atomicity and locking → N277 (use its `mutateTask`).
- `log-event` / events → N279. Hook scripts → N280.
- New commands or flags beyond what this spec names.

### Locked decision (from N271 — do not re-ask)

- State-changing CLI commands **require `--id`**. Read commands (`show`, `current`, and listing / stats) keep the current-task fallback.

## Implementation plan

1. **Strict parser (A11).** Use `node:util` `parseArgs` with `strict: true`, `allowPositionals` per command, and a per-command option table (`string` / `boolean` / `multiple`). Export the parse function for unit tests.
   - Unknown option → `error: unknown option --x for <cmd>`, exit 2.
   - A positional `Nxx` given to an id-taking command → `error: use --id Nxx`.
   - `--id=N05` must work.
   - An empty string is allowed only where meaningful; otherwise error.
2. **Help (A11).** Handle `--help` / `-h` before dispatch for every command: print that command's usage and exit 0, never execute. Covers `merge`, `update`, `init`, `migrate-layout` and all others.
3. **Require `--id` (A11).** A `requireId(opts)` helper for every state-changing command, e.g. `implement-*`, `review-*`, `fix-*`, `push`, `mr-update`, `merge`, `done`, `change-*`, `incident-*`, `status`, `set-flow`, `set-chain`, `chain-advance`, `advance`, `rename`, `log-event` (when it mutates task state). `resolveId`'s fallback stays only for read commands. Grep the role prompts (`src/agents/modules/*.json`, root `*_ROLE.md`) for any documented write command without `--id`; fix the source and re-compose.
4. **Transition table (A12).** In core, map each lifecycle command to its allowed `from` statuses for the default flow; for custom flows, use the flow's declared edges / status-transition modules where they exist (`/task-analyze` should confirm the exact source of truth). Enforce it inside `setStatus`. Route `status` through `writeStatus`. Validate `--verdict ∈ {approved, fix-needed}`. In `review-end` / `fix-end`, validate first, then save the side file, then save the shard.
5. **Friendly errors (A74).** The top-level catch prints `error: <message>` for every `Error` and exits 1; only non-`Error` throws are rethrown. Messages for "Task Nxx not found", "No task ID provided" and config/JSON errors name the task or file.
6. **Scaffold `$` bug (A76a).** `body.replaceAll(k, () => value)` in `core/spec.ts:11`.
7. **One open-incident rule (A72).** Export `INCIDENT_OPEN_STATUSES` from storage and use it in `show.ts`. Decide whether `fixed` counts as open; if it does, make `incident-resolve` say so and document `incident-status --status closed`.
8. **Dedupe and layering (A76b, A76c).**
   - Move `PRIORITY_WEIGHT`, the picker sort, `slugify` (one max length) and `loadFlows` to core.
   - Move `setTaskFlow` (and other helpers imported by `dashboard/server/index.ts:23` and `agents/init/index.ts:22-23`) from `cli/commands` into core.
   - `storage-port.ts`: delete it unless a second implementation is planned; update `seams.test.mjs` accordingly. If kept, route every call through it.
9. **Windows `bulk-*` (A81).** Spawn `process.execPath` with the bin script (or use `shell: true` with fixed args) instead of `insight-flow.cmd`. Before `bulk-down` sends SIGTERM, check the saved PID is still an insight-flow process.
10. **Tests.**
    - Parser unit tests: unknown flag, `--id=`, positional id, bare flag where a value is needed, `--help` on `merge` leaves status unchanged.
    - `--id` required error on a write command.
    - Rejected transitions (`review-end --verdict merged`, `push` on merged, `done` on ready); no side file written on an invalid verdict.
    - `$$` / `$&` in a title survive scaffolding.
    - The error output for an unknown task has no stack.
    - `incident-resolve` → `openIncidentCount` follows the chosen rule.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new parser and transition tests.
- Manual in `playground/`:
  - `insight-flow merge --help` prints usage and the current task is unchanged.
  - `insight-flow show N01` → `error: use --id N01`.
  - `insight-flow implement-start` → `error: --id is required`.
  - `insight-flow review-end --id <ready task> --verdict merged` → error, nothing written.
  - `insight-flow show --id N999` → one-line error, exit code 1.

## Notes

- Detail and evidence: `N271/AUDIT.md` A11, A12, A72, A74, A76, A81. The probes in the audit reproduce each parser failure.
- **Depends on N277** (`mutateTask` helper) and **N274** (shares `push.ts` / `notify.ts` edits). Both, and N267, must be merged first.
- This changes CLI behaviour that agents rely on. Update `packages/taskflow/README.md`'s command reference in the same PR.
- Recommended run: `/task-analyze N278` → `/task-implement N278`.
