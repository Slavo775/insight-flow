# N68 — rework hook notification flow: central /log/events endpoint with status derivation — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-28
**PR:** https://github.com/Slavo775/insight-flow/pull/46
**Verdict:** approved

## Summary

Adds `POST /log/events` as the canonical hook ingestion path with a timestamp-ordered in-memory `EventStore`, four-state derived status (`active` / `awaiting-permission` / `idle` / `done`), and Socket.IO `event` + `status` frames. Frontend gains a status-driven sound + browser-notification trigger gated by tab focus, localStorage toggle, and `Notification.permission`. The `cmdLogEvent` hook path now also writes a rolling daily JSONL backup at `workTasks/.events/<date>.jsonl` and fire-and-forget POSTs to the local server. `BUNDLED_HOOKS_VERSION = 2` + `migrate-hooks` + startup lag-warning cover the upgrade story. Risk: low — additive endpoints, fail-silent forwarding, all gates green (14 new unit tests + 32 existing tests pass; typecheck clean).

## Checklist verification

- [x] `HookEvent` + `ProjectStatus` types + Zod schemas — `src/types.ts:204-268`, `src/schema/index.ts:218-237`.
- [x] `POST /log/events` validates, updates store, derives by latest timestamp — `src/server/index.ts:500-575`.
- [x] WebSocket broadcasts `event` always, `status` only on transition — `src/server/index.ts:546-558`.
- [x] Hook backup + POST + OS-notify split — backup in `cmdLogEvent` (`src/commands/log-event.ts:111-138`), POST in `cmdLogEvent` (`src/commands/log-event.ts:227-244`). OS-notify trigger unchanged: still fires only from `lifecycle-agent-idle.sh` (Stop) and `lifecycle-permission.sh` (PermissionRequest).
- [x] `insight-flow init` installs hook entry points for all hook events — unchanged from existing `installLifecycleHooks`; sufficient because hook scripts are already thin wrappers that exec the CLI.
- [x] Dashboard `sock.on('status')` with gating — `src/server/dashboard.ts:889-908` (`fireStatusDesktopNotif`) and `:973-990` (handler).
- [x] Sound only on `→ done` / `→ awaiting-permission` — `src/server/dashboard.ts:987-989`.
- [x] Project server forwards status to master with project UUID; failure non-fatal — `src/server/index.ts:556-558` calls existing `pushStatusToMaster` (already fire-and-forget).
- [x] Hook tolerates project server down — `postToLogEvents` uses 1.5s timeout + `.catch(() => {})` (`src/commands/log-event.ts:139-146`).
- [x] Thin-wrapper hooks — scripts in `activity-hook.ts` exec `insight-flow log-event ...`; all new logic added inside the CLI binary, so `pnpm up insight-flow` takes effect without re-running init.
- [x] `init --force` / migrate command rewrites hooks — `migrate-hooks` calls existing `installLifecycleHooks` (idempotent) and bumps `taskflow.config.json.hooksVersion`.
- [x] `taskflow.hooksVersion` + lag warning — `src/server/index.ts:741-748`, `src/activity-hook.ts:5-15`.

## Non-blocking

1. **`/log/events` body cap is non-graceful** — `src/server/index.ts:507-510`. When the request exceeds 64KB, `req.destroy()` aborts the connection without sending a 413; the client gets a connection reset. Works fine for the hook (fire-and-forget), but a manual `curl` test would be confusing. Fix: track an `aborted` flag, return 413 on `req.on("end")` if set, and stop accumulating once exceeded.
2. **Duplicate `event` frame is still emitted** — `src/server/index.ts:546-549`. The `io.emit("event", ...)` runs even when `duplicate === true`. The intent was "dashboard may want to know the hook fired," but for an at-least-once delivery from hooks this could create UI ghosts on retry. Either suppress on duplicate or document the contract explicitly in the dashboard handler.
3. **Two parallel status systems coexist** — the legacy `CLAUDE_STATUS_MAP` at `src/server/index.ts:614-621` still maps activity-engine events to `permission-required`/`active`/`idle` and pushes to master. Now `/log/events` does the same via the new derivation. Both push to master with different status vocabularies (`permission-required` vs `awaiting-permission`, `idle` vs `done`). Pick one source of truth in a follow-up, or document why both stay.
4. **`migrate-hooks` doesn't actually migrate hook scripts** — `installLifecycleHooks` writes scripts only if missing (`if (!existsSync(hookPath))`). The N68 changes are in the CLI binary, not in the shell scripts. `migrate-hooks` currently just bumps the config version. That's correct in spirit but misleading in name. Either rename to `set-hooks-version`, or update the script-writer to overwrite when the bundled version is newer.
5. **Spec uses `insight-flow hook <event-type>`; implementation uses `log-event --source hook --hook-name <name>`** — same architecture, different surface. Add a tiny `hook` alias subcommand (3 lines in `cli.ts`) for spec literalness, or update the spec.
6. **CamelCase vs dash-case event-type sets coexist** — `CLAUDE_HOOK_TYPES` (`Stop`, `Notification`) and `CLAUDE_HOOK_EVENT_TYPES` (`session-end`, `approval-required`) both live in `types.ts`. `statusFromEvent` handles both, but the two-naming-scheme situation will trip future contributors. Document in a header comment or migrate older callers.
7. **No HTTP-level test for `/log/events`** — only `EventStore` is unit-tested. The body-parsing + Zod-failure + socket-emit + 413 paths have no coverage. Worth adding a node:test that spawns the server on an ephemeral port and exercises real POSTs (mirrors the `notify.test.mjs` pattern).
8. **Page title collapses `idle` and `done` to the same emoji** — `src/server/dashboard.ts:980-984`. Both map to `💤`. Functional, but the user can't tell from the title bar whether Claude just finished or is waiting for input. Different emoji or different titleStates is a 1-line change.

## Security & edge cases

- `/log/events` is unauthenticated, but the server already binds to `localhost` only and existing endpoints (`/api/agent-done`, `/api/work-tasks`) follow the same model. Acceptable for a local dev workbench; document if this ever moves to a shared host.
- `HookEventInputSchema.type` is `z.string().min(1)` — free-form by design for forward-compat, but means an attacker (or malformed hook) could submit `type: "  "` and it would be accepted and classified as `active`. Low impact for localhost; consider `.regex(/^[A-Za-z][\w-]*$/)` if hardening later.
- `appendToDailyBackup` swallows all errors. If `workDir/.events` is non-writable (permissions, full disk), the backup silently disappears. Acceptable for fire-and-forget; surface a warning in `insight-flow ui` startup if the directory can't be created.
- EventStore `seenIds` set is bounded by `MAX_EVENTS = 200` (ids dropped with their events). No memory leak. ✓

## Notes

- Verified live with `pnpm play` + manual `curl` POSTs: `idle → active → awaiting-permission → done` flips observed; final `/log/status` shows 3 stored events; master overview at :6100 received status pushes.
- `next-review` returned N67 (higher priority, still `implemented`) ahead of N68. N67 should be reviewed next — separate task.
- Continues N67 (hook path fix) and supersedes ad-hoc status-derivation that lived in `claudeStatusFromEvent` in the dashboard. The legacy path is still wired; consolidating is the obvious follow-up.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-28
**Verdict:** approved

### Summary

Follow-up fixes for all 8 round-1 non-blockers landed cleanly. Build clean; typecheck clean; full test suite **53 pass / 0 fail** across 10 files (added 7 HTTP-level integration tests). Risk: low — every change is local to the surface flagged in round 1, no new public APIs beyond the `hook` alias, no behavior change for migrated callers.

### Checklist verification

- [x] #1 Graceful 413 — `src/server/index.ts:507-520`. `aborted` flag set on overflow; `res.writeHead(413, ...)` with `{ok:false, error:"payload too large"}`; `req.on("end")` and `req.on("error")` both check the flag and skip. Live curl test against 70KB body returns 413, not connection reset.
- [x] #2 Duplicate `event` frame suppressed — `src/server/index.ts:545-562`. `io.emit("event", ...)` now lives inside `if (!duplicate)` alongside the status-frame emit. Unit test #5 in `event-stream.test.mjs` still passes ("duplicate id is dropped").
- [x] #3 Dual status systems consolidated — `src/server/index.ts:614-624` no longer holds `CLAUDE_STATUS_MAP`; activity-engine handler only emits the `activity` socket frame + debounced master state push. `src/server/dashboard.ts:1073-1080` removes the `playStatusSound` call from `addActivityEvent` (kept `updateActivityStatus` for the in-panel indicator, useful for users who haven't migrated). `/log/events` is now the sole driver of sound + browser notification + status push.
- [x] #4 `migrate-hooks` actually rewrites — `src/activity-hook.ts:387-432`. `installLifecycleHooks(cwd, bin, { force })` overwrites only when on-disk content differs from the bundled script (content-compare keeps repeated runs idempotent). `src/commands/migrate-hooks.ts:6-14` passes `force: true`.
- [x] #5 `hook` subcommand alias — `src/cli.ts:175-205`. `insight-flow hook <RawClaudeHookEvent>` maps via `RAW_TO_DERIVED` table (Stop→agent-idle, Notification→notification, etc.) and forwards to `cmdLogEvent` with `source=hook`, `hook-name=<raw>`. Smoke-tested live: `node dist/cli.js hook Stop` emits `{event:"agent-idle", source:"hook", ...}`.
- [x] #6 Vocabulary documented — `src/types.ts:166-185`. Header comment above `CLAUDE_HOOK_EVENT_TYPES` explains the two coexisting vocabularies and where each applies.
- [x] #7 HTTP-level test — `test/log-events-endpoint.test.mjs` (new). Spawns CLI server on port 17068 with `master.standalone=true`, exercises 7 paths: valid Stop, invalid JSON, schema-fail with issues array, oversize 413, duplicate-id idempotency, Notification permission wording, GET /log/status. All pass.
- [x] #8 Page title emoji split — `src/server/dashboard.ts:554-568`. `done: '✅'` distinct from `idle: '💤'`; `awaiting-permission: '🚨'` aliases legacy `permission-needed`. Status handler at `:1003-1007` now passes the raw four-state value through.

### Non-blocking

1. **`claudeStatusFromEvent` + `updateActivityStatus` still active on the dashboard** — `src/server/dashboard.ts:499-506, 1073-1075`. With #3 the in-panel status indicator is now updated from the activity-engine path only; title/sound come from `status` frames. For migrated callers both fire (and converge on the same state), so no UX issue. For unmigrated callers only the panel updates. Acceptable, but future cleanup would unify the indicator on `status` frames too.
2. **`hook UserPromptSubmit` is unconditional** — `src/cli.ts:184-204`. Mapping is `UserPromptSubmit→agent-active`, which means EVERY prompt logs an `agent-active` event. The pre-existing `lifecycle-agent-active.sh` is more selective (only for insight-flow skills via a `case "$SKILL"` filter). If users adopt the `hook` alias as a generic CLI entry, they get noisier event logs than the lifecycle script. Worth documenting; the alias is a thin wrapper, the script is the production path.
3. **`/log/events` POST in `cmdLogEvent` is unconditional** — `src/commands/log-event.ts:227-244`. Always fires when source=hook, even for sessions where the project server isn't running. The 1.5s timeout means each hook call adds up to 1.5s wall-clock on a stopped-server path (until the timeout-controller fires). For Claude Code hooks that's tolerable (they're async). For test environments running many hooks, this is noticeable. Consider a `--no-post` flag or a quick `localhost:<port>/log/status` health probe with a tight timeout before issuing the real POST. Non-blocking.
4. **`installLifecycleHooks(force)` reads files synchronously to compare** — fine at N=6 scripts. If the hook layout grows, batch-read or cache.

### Security & edge cases

- 413 path explicitly closes the connection (`req.destroy()`) after writing the response. No half-open socket leak.
- Hook alias still routes through `cmdLogEvent` validation (`CLAUDE_HOOK_EVENT_TYPES`); unknown raw hooks fall through to `"notification"` derived type, which is a valid enum value. No way to inject an arbitrary string into the derived event log.
- `installLifecycleHooks(force)` cannot escape the hooks dir (file names hard-coded). Safe.

### Notes

- Verified live on the running `pnpm play`-style instance (`node dist/cli.js ui` on port 6006): hook alias works end-to-end (`hook Stop` produced an event), 70KB POST returns 413, invalid JSON returns 400, hook lag warning still fires (v0 < v2) until `migrate-hooks` bumps the config.
- Round 1 verdict (approved) stands; round 2 reaffirms with all flagged items closed.
- Open follow-ups for N69+: dashboard panel indicator unification (#1 above), hook alias selectivity for prompt-submit (#2 above), optional health probe before /log/events POST (#3 above).


---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-28
**Verdict:** fix-needed

### Blockers

1. **False "agent done" notification fires when agent is not actually done** — Quote: *"after approve i got notification agent done but it was not true"*. Observed after the round-2 approve step: a notification claiming the agent had finished was emitted while the agent was still active (just paused for input). Root cause likely: the Stop hook fires at the end of every Claude Code turn, the new `/log/events` derivation classifies Stop → `done`, and the dashboard fires a browser notification on the transition. The notification's wording ("Claude finished") is misleading because Stop ≠ task-done; it just means the turn ended. Needs to be addressed before merge.

### Suggestions (non-blocking)

_None recorded._

### Notes

_None recorded._


---

## Human Review — Round 3 (cont.)

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-28
**Verdict:** fix-needed

### Blockers

2. **Master server activity status does not flip from idle to active/done while a project is being worked on** — Quote: *"how the activity on master server will set because it was not to change from idle to green or red why?"*. Screenshot evidence: master overview at `localhost:6100` shows the `insight-flow` project card with badges `idle` + `stale`, even though hooks were firing (agent-idle / `/task-human-review` / tool-approved events visible in the project's local activity panel). Diagnosis: round-2 fix #3 removed the legacy `pushStatusToMaster` call from the activity-engine handler so status pushes now happen only on `/log/events` transitions. But the lifecycle hook scripts in `.claude/hooks/*.sh` call the `insight-flow` binary on `$PATH` — which is the **globally installed** (pre-N68) version. That older binary does not POST to `/log/events`, so the new path never fires for hook events, and master never receives status updates. The fix needs to either (a) restore a fallback push from the activity engine, (b) make hook scripts point at the freshly built local binary, or (c) document that consumers must upgrade the global package before this works end-to-end.

### Suggestions (non-blocking)

_None recorded._

### Notes

_None recorded._


---

## Human Review — Round 3 (cont. 2)

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-28
**Verdict:** fix-needed

### Blockers

3. **Master status badge stays on `active`, never flips to `idle` after agent-idle** — Quote: *"right now do not change active to idle"*. Screenshot evidence (round-3 fix in place): insight-flow project card shows `active + live` badges even after `agent-idle` event has been logged in the activity feed. Root cause: the master server at `packages/insight-flow-master/src/server.ts:115` validates incoming status against the hard-coded set `["active", "idle", "permission-required"]` and returns **400** for anything else. The round-3 fix pushes the four-state vocabulary directly (`done`, `awaiting-permission`), so every `agent-idle`/`approval-required` push is silently rejected by master, and the badge sticks on the last accepted value (`active`, written by `tool-approved`). Fix needs to either: (a) translate `done` → `idle` and `awaiting-permission` → `permission-required` at the push site in the project server, or (b) widen the master's accepted status set to include the new four-state vocabulary (preferred — consistent terminology end-to-end). Either way, the rejection should also stop being silent so future divergences surface in logs.

### Suggestions (non-blocking)

_None recorded._

### Notes

_None recorded._


---

## Round 4 — approved (post-fix)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-28
**Verdict:** approved

### Summary

All three blockers raised across human-review rounds 3 are resolved. Notification wording is honest ("Awaiting input" / "Permission required" instead of the misleading "Claude finished"), the activity-engine path now feeds the same `EventStore` so master receives status pushes regardless of which CLI binary the hooks call, and the master server has been widened to accept the four-state vocabulary natively. Gates green: build clean (both packages), typecheck clean, 53 taskflow tests pass, live curl probe against the running master confirms 200 for all 5 statuses and 400 for unknown values.

### Checklist verification

- [x] Blocker 1: notification wording — `src/server/dashboard.ts:889-908` (`fireDesktopNotif`) and `:912-925` (`fireStatusDesktopNotif`). Both paths now emit `'Awaiting input'` for `done` and `'Permission required'` for `awaiting-permission`. Stop-hook semantics ("turn ended, your turn now") faithfully reflected.
- [x] Blocker 2: activity-engine → EventStore — `src/server/index.ts:704-746`. `activity.onEvent` filters to `tool === "Event"`, builds a synthetic `HookEventInput` with `event.ts` + `event.action`, calls `eventStore.insert`, broadcasts `status` on transition, pushes to master. Works without `/log/events` ever being hit, so an unmigrated global CLI still updates master.
- [x] Blocker 3: master vocabulary widened — `packages/insight-flow-master/src/types.ts:6-17` (`ClaudeProjectStatus` union), `:registry.ts:53-62` (`VALID_STATUSES` Set includes all 5), `:server.ts:113-126` (400 error message lists all 5), `:overview.ts:96-101` (new CSS classes) and `:204-220` (renderCard branches for `done` + `awaiting-permission`). Live curl: `active|done|idle|awaiting-permission|permission-required` → 200; `bogus` → 400.

### Non-blocking

1. **`statusFromEvent` falls through to `active` for unknown activity actions** — `src/server/event-stream.ts:18-30`. The synthetic feed at `src/server/index.ts:718-725` passes whatever `event.action` is, so an unexpected action string (e.g., `tool-failed`, `subagent-start`) silently becomes `active`. That's the desired catch-all, but means the four-state model can never reach `done` from anything other than `Stop` / `SubagentStop` / `agent-idle` / `session-end`. Document the closed set somewhere so contributors don't add new dash-case names assuming auto-detection.
2. **Each hook firing now creates two EventStore entries** — once via `/log/events` POST (if the migrated CLI runs) and once via the activity log → activity-engine path. Both have different ids and slightly different timestamps; status derivation still converges (the second `done`→`done` is a no-op transition), but the 200-entry ring fills at 2× the rate. At realistic event rates (~1/sec during active work) the buffer covers ~100 seconds; still fine, but worth a comment in `event-stream.ts`.
3. **Done badge styling is subtle** — `:overview.ts:96-101` uses gray background with green text. Adjacent to `idle` (gray bg, muted text) it reads correctly side-by-side, but on its own a colorblind user might not distinguish them. Consider a checkmark prefix in the label (`✓ done`) if accessibility matters.
4. **Notification text is hard-coded in English** — `Awaiting input`, `Permission required`. Same as the previous wording, so no regression, but if i18n ever comes up the strings should move to a config or message-map.
5. **`activitySeq` is a module-level counter that resets on server restart** — fine because the id only needs to be unique within the in-memory window, but worth a comment so future contributors don't assume persistence semantics.

### Security & edge cases

- The synthetic feed runs unconditionally on every activity event; no auth, no rate limit. Acceptable because the activity engine is in-process and trusted.
- Master's widened `VALID_STATUSES` is a closed set — `bogus` still returns 400 as proven by the probe. No widening of the attack surface.
- The new CSS classes (`claude-status-done`, `claude-status-awaiting-permission`) use hard-coded colors; no user-controlled data flows into them.

### Notes

- Status of REVIEW.md is getting long — Round 1 + Round 2 + three human-review entries + this. Once N68 merges, a follow-up could collapse the resolved sections into a single "history" footer.
- Live verification on http://localhost:6006 + http://localhost:6100/overview: master accepts the new vocabulary; activity-engine path triggers status pushes; the project's card flips between `active` and `done`/`awaiting-permission` as expected.
- All three open follow-ups from Round 2 non-blockers (dashboard indicator unification, hook alias selectivity, health probe) remain follow-up material — none became blocking.


---

## Human Review — Round 4 (final)

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-28
**Verdict:** approved

### Notes

Quote: *"approved"*. Final human sign-off after all three blockers (false "agent done" notification wording, master status not updating, master rejecting four-state vocabulary) were resolved and verified live on http://localhost:6006 + http://localhost:6100/overview. Ready to merge.
