# N79 — Cursor permission-required notifications parity with Claude Done shortcut plus hook coverage

**Type:** fix
**Priority:** medium
**Created:** 2026-06-02

## Problem

On Cursor, insight-flow **Done** browser notifications work (via `POST /api/agent-done` from `insight-flow-stop.sh`), but **Permission required** does not. Claude fires on every `PermissionRequest`; Cursor has no equivalent event. N77 only synthesized permission on `beforeShellExecution` for a narrow shell pattern list and relied on `/log/events` status transitions — unlike Done, which uses a direct dashboard shortcut. Users see permission prompts in Cursor with no matching insight-flow toast.

## Goal

1. When the Cursor approval gate fires, the dashboard shows `<project>: Permission required` as reliably as Done (not dependent on EventStore transition timing alone).
2. Extend Cursor hooks so approval detection covers `preToolUse` and `beforeMCPExecution` (conservative matchers + `{"permission":"ask"}`), not only sensitive `beforeShellExecution`.
3. Keep emitting `approval-required` to `/log/events` for status pill, master overview, and sounds.
4. Claude hook behavior and notification wording unchanged.
5. Document residual parity limits (no native `PermissionRequest`; cloud-agent caveats).

## Scope

### In scope

- `packages/taskflow/src/server/index.ts` — new `POST /api/agent-permission` (mirror `/api/agent-done`; respect `notifications.browser`).
- `packages/taskflow/src/server/dashboard.ts` — subscribe to new socket event (e.g. `agent-permission`) and call `fireStatusDesktopNotif('awaiting-permission')` (or shared helper); keep existing `status` → `awaiting-permission` path.
- `packages/taskflow/src/cursor-hooks.ts` + `.cursor/hooks/insight-flow-approval.sh` (regenerated) — curl new endpoint when gate fires; factor shared “sensitive op” matcher if needed.
- `.cursor/hooks.json` generation — register `preToolUse` and/or `beforeMCPExecution` approval scripts (thin scripts or extended approval script with event arg).
- `packages/taskflow/src/hook-parse.ts` / `cli.ts` — ensure `approval-required` events from new hooks POST with `type: approval-required` (or `hook-name` that `statusFromEvent` maps).
- Tests: HTTP test for new endpoint; hook generation includes new events; optional test that permission socket fires when browser notifications enabled.
- `packages/taskflow/README.md` — Cursor permission notification behavior + matcher tuning note.

### Out of scope

- Breaking existing notification paths: `/api/agent-done`, `insight-flow-stop.sh`, Claude `lifecycle-permission.sh`, or current `beforeShellExecution` allow/ask behavior for matched commands.
- Changing `git push` (or other matched ops) from **`ask` → `deny`** or removing the ability to approve and run them.
- Cursor IDE native notification settings / macOS Focus.
- N69 stateful status machine (unless A alone still shows churn in manual QA).
- Auto-deny or broad auto-`allow` policy changes beyond conservative `ask`.
- Cloud-agent session hooks (document only).

## Implementation plan

1. **Direct permission shortcut (Option A)** — In `server/index.ts`, add `POST /api/agent-permission` that emits `agent-permission` on Socket.IO when `config.notifications?.browser !== false`. In `dashboard.ts`, `sock.on('agent-permission', …)` → `fireStatusDesktopNotif('awaiting-permission')` + existing permission sound via `playStatusSound('permission-needed')` if not already triggered by `status` frame (avoid double sound: pick one path or debounce).
2. **Wire Cursor approval script** — In `cursor-hooks.ts` `APPROVAL_SCRIPT`, after `hook approval-required` + `notify`, read port from `taskflow.config.json` and `curl -sf -X POST http://localhost:<port>/api/agent-permission` (same pattern as `STOP_SCRIPT`). Regenerate `.cursor/hooks/insight-flow-approval.sh` via init or document `--force`.
3. **Hook coverage (Option B)** — Add `.cursor/hooks.json` entries for `preToolUse` and `beforeMCPExecution` pointing at an approval gate script (parameterized by `$1` event name or separate thin wrappers). Match sensitive tools/commands (extend case list: e.g. `Shell`, `run_terminal_cmd`, network/MCP tool names — keep conservative). On match: log `approval-required`, notify, curl `/api/agent-permission`, print `{"permission":"ask",…}`; else `allow`. **Stdout must remain only the permission JSON** (no hook JSON on stdout — N78 lesson).
4. **Matcher helper** — Optional small bash function or shared snippet in generated scripts to avoid three copies of the case list; single source in `cursor-hooks.ts` template string.
5. **statusFromEvent hardening** — Optionally map `PermissionRequest` → `awaiting-permission` in `event-stream.ts` for Claude POST consistency (low risk).
6. **Tests** — `log-events-endpoint.test.mjs` or new test: `POST /api/agent-permission` returns 200; generation test asserts `hooks.json` includes `preToolUse`/`beforeMCPExecution` when applicable.
7. **Docs** — README table row for Cursor permission path; parity caveat paragraph.

## Verification

- `pnpm --dir packages/taskflow run build` && `pnpm --dir packages/taskflow test` pass.
- Manual (Cursor): dashboard open, browser notifications granted. Trigger sensitive shell (`git push` dry-run) → `<project>: Permission required` toast + sound.
- Manual: Trigger MCP or tool approval path covered by new matcher → same toast (if Cursor shows approval UI).
- Manual: Agent turn end still shows **Done** (no regression on `/api/agent-done`).
- Manual (Claude): `PermissionRequest` still fires permission notification (unchanged).
- With dashboard **closed**, OS `insight-flow notify "Approval required"` still fires from hook (existing behavior).
- **Non-regression:** `git push` (and other already-matched shell ops) still return `{"permission":"ask"}` and remain approvable in Cursor; **Done** notifications unchanged.

## Notes

- Design record: this folder `ANALYSIS.md` (Option C). Builds on N77 (`cursor-hooks.ts`, approval gate).
- **Done vs permission asymmetry** was the smoking gun: `agent-done` direct vs status-only permission.
- Matcher tuning is iterative; ship conservative defaults, document how to extend in `taskflow.config.json` as follow-up if needed.
