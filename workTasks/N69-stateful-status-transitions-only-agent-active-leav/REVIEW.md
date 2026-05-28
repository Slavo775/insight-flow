# N69 — stateful status transitions: only agent-active leaves idle/done; any event leaves awaiting-permission — Review

## Human Review — Round 1

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-28
**PR:** (no PR yet)
**Verdict:** fix-needed

### Blockers

1. **Stuck in `active` despite work being done.** The status does not transition `active → done` in the running session — the dashboard pill stays on `active` after Claude finishes.

   > Human verbatim: "now we are stuck in active despite we are done"

   **Where to look:**
   - `packages/taskflow/src/server/event-stream.ts` — `terminalStatus()` is supposed to map `Stop` / `SubagentStop` / `agent-idle` / `session-end` to `done` regardless of from-state. Verify the actual event `type` arriving at `EventStore.insert` matches one of those strings (case, dash-vs-camel, payload-vs-type field).
   - `packages/taskflow/src/server/index.ts:704–738` — the activity-engine fallback path synthesises events from `event.action`. Confirm that when Claude stops, an `Event` activity row with `action === "agent-idle"` actually fires (or that the direct `POST /log/events` from the `Stop` hook arrives).
   - `packages/taskflow/src/activity-hook.ts:321–328` — the `lifecycle-agent-idle.sh` hook only emits if a guard fires; confirm the guard is satisfied in this session.
   - Running server: ensure the playground server was restarted after the N69 build so the new `nextStatus` logic is actually loaded.

   **Reproduce:**
   - Start `pnpm play`, open Claude Code in `playground/`, run any short task, watch the pill in the dashboard. Expected: `active → done` after Claude finishes. Observed: pill stays at `active`.

   **Possible root causes to triage in order:**
   1. Server wasn't restarted after build — old binary serving old logic. Cheapest check first.
   2. Hook isn't firing `Stop` / `agent-idle` for the running session (hook installation drift, `CLAUDE_PROJECT_DIR` mis-resolution per N67, etc.).
   3. Event arrives with a `type` value that no branch of `terminalStatus` recognises — e.g. lower-case `"stop"`, or under a different field name.
   4. `EventStore.insert` is called but the event has an `id` that collides with a recent dedup entry, silently dropping it.

### Non-blocking

- None recorded this round.

### Notes

- Build, typecheck, and the full `pnpm test` suite are green — the unit tests confirm `nextStatus("active", Stop) === "done"` in isolation. The bug therefore lives in event delivery / wiring, not in the transition function. The fix likely belongs in `index.ts` (event ingestion), `activity-hook.ts` (hook emission), or simply a server restart — not in `event-stream.ts`.

---

## Fix Response — Round 1

**Fixer:** task-review-fix
**Date:** 2026-05-28

### Root cause

The transition function is correct in isolation, but it only recognised the **dash-case derived** event vocabulary (`agent-active`, `agent-idle`, `approval-required`, `session-end`). The real `POST /log/events` payload, however, carries the **raw Claude Code hook name** as `type`:

> `commands/log-event.ts:248` — `type: hookName ?? eventType` — so a UserPromptSubmit hook POSTs `type: "UserPromptSubmit"`, not `type: "agent-active"`.

Effect under the N69 first round:
- `idle` + UserPromptSubmit (raw) → no terminal match, not `"agent-active"` → **stays `idle`** (would-be wake never fires).
- `active` + Stop (raw) → matched `"Stop"` branch → done ✓ (this one happened to work).
- `active` + PermissionRequest (raw) → no match → falls through generically → stays active ✗.
- `active` + SessionEnd (raw) → no match → stays active ✗.

Combined with the second observation (the running server PID 4230 was started 1h08m before the N69 build), the live system showed the **old** stateless behaviour — any event flips to active — masking the broken raw-name handling.

### Fix

`packages/taskflow/src/server/event-stream.ts` now recognises BOTH vocabularies in every check:

- `isDoneEvent` accepts `Stop` | `SubagentStop` | `SessionEnd` | `agent-idle` | `subagent-done` | `session-end`.
- `isPermissionEvent` accepts `PermissionRequest` | `approval-required` | `Notification`/`notification` with permission wording.
- `isIdleNotification` accepts `Notification` | `notification` without permission wording.
- `isAgentActiveEvent` (the headline rule) accepts `agent-active` | `UserPromptSubmit`.

The activity-engine fallback path at `server/index.ts:724` (synthetic `type: event.action` — already derived) and the `/log/events` POST path (raw hook name) now converge on the same transition matrix.

### Verification

- `node test/event-stream.test.mjs` — 56/56 pass, including 9 new tests for raw forms and an end-to-end "real hook POST cycle" that walks `UserPromptSubmit → PreToolUse → PostToolUse → Stop → PreToolUse → UserPromptSubmit` and asserts each transition.
- `node test/log-events-endpoint.test.mjs` — 7/7 pass.
- `pnpm test` (full suite) — green.
- `pnpm typecheck` — green.
- Smoke replay of the live server's actual event sequence (raw UserPromptSubmit / PreToolUse / PostToolUse / Stop) yields the correct sticky-from-done behaviour.

### Files changed

- `packages/taskflow/src/server/event-stream.ts` — alias-aware matchers.
- `packages/taskflow/test/event-stream.test.mjs` — raw-form coverage; removed `UserPromptSubmit` and `subagent-done` from the `NON_WAKING_EVENTS` sweep (they belong in different branches now).

### Operational note — required for the user to observe the fix

The dev server (`pnpm play` / `pnpm ui`, currently PID 4230) needs to be restarted so it loads the new `dist/`. Without restart, the in-memory store still runs the pre-N68 stateless logic regardless of how correct the on-disk code is. After `/task-git` pushes this round, run:

```
kill 4230 && pnpm play
```

(or whatever the equivalent restart command is for the session).


---

## Round 2 — AI Re-Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-28
**Verdict:** approved

### Summary

Round-2 fix addresses the Round-1 human blocker correctly: `event-stream.ts` now recognises both the raw Claude Code hook names (`UserPromptSubmit`, `PermissionRequest`, `SessionEnd`, `Stop`, `SubagentStop`, `Notification`) and the dash-case derived names (`agent-active`, `agent-idle`, `approval-required`, `session-end`, `subagent-done`, `notification`). The headline rule — *idle/done → active only via `agent-active`-class events* — is preserved. Risk: **low**. Changes are localised to one file (the transition function) plus tests; no schema, API, or wiring changes; both POST and activity-engine ingestion paths funnel through `EventStore.insert` (verified at `index.ts:545` and `index.ts:727`).

### Checklist verification

- [x] `nextStatus(from, event)` exported from `event-stream.ts` and used by `EventStore.insert` — verified at `event-stream.ts:93,182`.
- [x] `idle` / `done` sticky against generic events — `event-stream.test.mjs` sweeps 9 non-waking types across both states.
- [x] `awaiting-permission` flips to `active` on first non-terminal event — covered by 3 tests.
- [x] Terminal mappings unchanged + extended with raw aliases — `isDoneEvent`, `isPermissionEvent`, `isIdleNotification` all accept both vocabularies.
- [x] Master-forwarder uses the same transition logic — both ingestion paths share `eventStore.insert`; no separate derivation lives elsewhere (grepped `statusFromEvent` / `deriveStatus` — only consumers are the test file and the legacy back-compat export).
- [x] Cold-start replay correct — `deriveStatus` is now a fold over `nextStatus` starting from `idle`.

### Blockers

None.

### Non-blocking

1. **Stale comments at `server/index.ts:704–722` reference `statusFromEvent`.** The code actually routes through `eventStore.insert` → `nextStatus` now. The comments aren't wrong (the store internally uses the new function which subsumes the old one), but they name the old helper. One-line touch-up when next editing that file: replace "`statusFromEvent` already knows" with "`nextStatus`'s terminal matchers already know".

2. **Top-of-file matrix in `event-stream.ts:6–23` doesn't list the raw aliases.** The matrix says `terminal-done = Stop | SubagentStop | agent-idle | session-end`, but the implementation also accepts `SessionEnd` and `subagent-done`. The "Event-type matchers" doc block below (lines 25–36) does call this out, so a reader who scrolls finds the full list. Optional polish: extend the matrix legend itself to include all aliases.

3. **`isAgentActiveEvent` only knows two names.** If a future Claude Code hook should also count as a wake event (e.g. a hypothetical `SkillStart`), it needs to be added here AND mapped at `cli.ts:201`. This is a maintenance pinch point but a deliberate one — the spec's intent is for the wake vocabulary to stay narrow. No action required now.

4. **Edge case: `awaiting-permission + Notification(non-permission wording) → idle`.** Terminal events always apply regardless of from-state, so a stray idle-wording notification during a permission prompt would flip status to `idle`. This is N68 baseline behaviour, not a regression from N69, and the test "awaiting-permission + Notification(permission again) stays" already implies the contrast. Worth a one-line test for the non-permission case if a future review wants to lock it down.

### Security & edge cases

- Schema (`HookEventInputSchema.type`) is free-form `z.string().min(1)` — raw forms pass validation. Confirmed at `schema/index.ts:233`.
- Payload coercion in `hasPermissionWording` uses `String(payload?.message ?? "")` — safe against undefined, non-string, or missing payload.
- Dedup by `event.id` is unchanged; out-of-order arrival re-folds the buffer rather than masquerading a stale event as latest. Both paths exercised by tests.

### Notes

- 56/56 event-stream unit tests pass; 7/7 endpoint tests pass; full `pnpm test` green; `pnpm typecheck` clean. End-to-end smoke replay of the live server's actual raw event sequence (`UserPromptSubmit → PreToolUse → PostToolUse → Stop → PreToolUse → UserPromptSubmit`) produces the correct sticky-from-done behaviour.
- Operational follow-up from the Round-1 fix response has been executed: server on port 6006 was restarted with the new `dist/`, fresh `EventStore` confirmed at `status=idle, events=0`. Future restarts after `event-stream.ts` changes should be folded into the dev loop or a watch script (no action this round).
- Merge-ready. Run `/task-git` to push and open the PR.

---

## Polish — Round 3 (non-blocking follow-ups, user-authorised)

**Author:** task-review-fix
**Date:** 2026-05-28

Addresses the three actionable non-blocking notes from Round 2 (#3 was explicitly "no action required"):

1. **Round-2 note #2** — `event-stream.ts:6–23` matrix legend now lists every accepted alias on each row (`Stop | SubagentStop | SessionEnd | agent-idle | subagent-done | session-end` etc.).
2. **Round-2 note #1** — `server/index.ts:704–710,722–723` comments updated: references to the legacy `statusFromEvent` replaced with `nextStatus` / `eventStore.insert`. Behaviour-neutral.
3. **Round-2 note #4** — added `event-stream.test.mjs` test `nextStatus: awaiting-permission + Notification(idle wording) → idle (terminal beats from-state)` to lock the documented edge case.

### Files changed (polish only)

- `packages/taskflow/src/server/event-stream.ts` — matrix legend.
- `packages/taskflow/src/server/index.ts` — comments only.
- `packages/taskflow/test/event-stream.test.mjs` — +1 test.

### Gates

- Build ✓ · typecheck ✓ · event-stream tests 57/57 (was 56, +1 edge-case lock) · log-events-endpoint 7/7 · full `pnpm test` green.
