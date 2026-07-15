# N238 — Single-source status engine + hub-only notifications (deterministic + DRY) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-15
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Strong, well-scoped implementation. The core state machine (`core/status-machine.ts`), the deletion of the project-side notifier, and the un-blobbing of `MASTER_NOTIFY_JS` into a real vite-built module are all correct and match the spec; the hub-notify port is behaviorally faithful to the original blob (settings loading is actually slightly more robust). Build is green, 360/360 tests pass, typecheck + eslint clean, and security review found nothing. **One HIGH correctness bug blocks approval:** the new machine claims to accept both CamelCase hook names and dash-case derived names, but misses two dash-case names — most importantly `session-start` — which are actively fed into the `EventStore` via the activity feed, breaking the very determinism the task set out to fix. Plus a scope-hygiene blocker (unrelated files reformatted).

## Checklist verification

- [x] State machine module in `core/` — pass (`status-machine.ts`)
- [x] `SubagentStop` ignored (no false done) — pass (verified by unit test + read)
- [x] Permission sticky, cleared by work/stop — pass
- [x] Idle/pause stays active; only real Stop = finished — pass (CamelCase path); **partial** — dash-case `session-start`/`notification` misrouted (Blocker 1)
- [x] Stuck-active decay — pass (with a self-healing lag caveat, NB-3)
- [~] `tool_use_id` correlation — intentionally skipped, rationale documented — accepted
- [x] `event-stream.ts` rewired — pass
- [x] Project-side notifier deleted; badge/title kept — pass
- [x] `MASTER_NOTIFY_JS` → built module at `/hub-notify.js` — pass
- [x] Single `NotifSettings` + single `WATCHED` (5-vs-8 drift fixed) — pass (but see NB-1: `done` toggle)
- [x] Docs recommend hub + silent-when-direct — pass

## Blockers

1. **HIGH — dash-case `session-start` misrouted to `active` — `packages/taskflow/src/core/status-machine.ts:60`**
   The machine handles dash-case terminals (`session-end`/`agent-idle`/`idle`/`done` at line 47) but the `session-start` branch (line 60) only matches CamelCase `SessionStart`/`sessionStart`. The dash-case `"session-start"` — which the activity feed inserts into the `EventStore` (`index.ts:463` passes `event.action` verbatim; the SessionStart hook row carries `action: "session-start"`) — falls through to the default `return "work"` → `turn: "active"`.
   **Why it matters:** with `activityEngine` enabled, a session start fires **two** inserts (CamelCase `SessionStart` → idle-seed via `POST /log/events`, and dash-case `session-start` → active via the activity feed) with different ids, so dedup drops neither and whichever folds last (by timestamp) wins. Result: non-deterministic status on every session start — exactly the determinism this task exists to fix. A freshly-started/seeded session reads "active" with no real work until the 5-min decay.
   **Fix:** add `|| t === "session-start"` to the session-start branch (line 60).

2. **MEDIUM — dash-case `notification` misrouted to `active` — `packages/taskflow/src/core/status-machine.ts:53`**
   Only CamelCase `"Notification"` is inspected. The dash-case `"notification"` (Cursor's `cursorEventToDerived` fallback, `hook-parse.ts:77`; also `RAW_TO_DERIVED`) falls through to `"work"` → active. On the activity path the payload is empty, so it can't be permission-classified, and it can wrongly flip a finished project `done → active` — the exact "idle Notification must not mark finished/active" case the spec forbids.
   **Fix:** handle `t === "notification"` alongside `"Notification"`; treat bare dash-case `notification` (empty payload) as `"ignore"`.

3. **SCOPE — 12 unrelated files reformatted — process**
   `pnpm run format` (run during implementation) reformatted files unrelated to N238: `FlowEditor.tsx`, `InstallModal.tsx`, `NewProjectModal.tsx`, and 9 test files (`agent-command`, `custom-defs-api`, `default-flow`, `emit`, `hub-registry`, `inputs`, `install-targets`, `master-liveness`, `rename`). Pure prettier whitespace, but it violates scope discipline and bloats the diff (the pre-commit hook only formats staged files, so these would not normally land).
   **Fix:** `git checkout -- <those 12 files>` to revert them; keep only N238 files. Use `git add -p` / stage only intended files at commit time.

## Non-blocking

1. **`done` settings toggle is mislabeled / partially inert — `hub-notify.ts:189-192`, `SettingsMenu.tsx:74`.** Unifying `WATCHED_STATUSES` to 8 added a `done` toggle labeled "Claude finished". `done` is both a TaskStatus and a claudeStatus: the toggle (via `settings.statuses["done"]`) gates the *task-status* → done notification, but the "Claude finished" notification (the `claudeStatus` branch, ungated) fires regardless. So unchecking "Claude finished" does not silence Claude-finished. Suggest gating the `cs === "done"` notify on `settings.statuses["done"] !== false`, or relabel to disambiguate task-done vs Claude-finished.
2. **Decay is master-only + resume lag — `event-stream.ts:57-63`, `index.ts:645-659`, `:1526`.** `getStatus()` decays but never mutates `this.status`, so after a decay→idle push a resuming work event computes `from==="active"/to==="active"` → no transition push; the hub self-heals only on the next 60s tick. Separately, the decay tick pushes to master but does not `transport.emit("status", …)`, so an open **local** dashboard never sees the `active→idle` decay. Both are bounded/self-healing, but consider reconciling `lastPushedStatus` in the insert push path and emitting the decay frame locally.

## Security & edge cases

Security review: **clean.** `getHubNotifyJs` uses a fixed path (no traversal); hub-notify's `/events` payload is `JSON.parse`-in-try/catch with no `innerHTML`/`eval`; untrusted `projectId` is `encodeURIComponent`'d so `openWindow` stays same-origin; the decay push sends only a status string to the existing authenticated endpoint. (Pre-existing, out of scope: `pushStatusToMaster` passes its token in the query string.)

## Notes

- Blockers 1 & 2 are the same class (incomplete dash-case coverage in `actionFromEvent`) and fix in the same function — do them together and add a unit test feeding dash-case `session-start` / `notification` through `deriveStatus`.
- Live hub-open behavior (real transitions firing notifications) was not exercised — recommend a manual smoke through the hub after the fix.
- The `tool_use_id` skip is accepted: with `SubagentStop` ignored and the timestamp-ordered fold, it would be dead code.

## Review-fix (Round 1) — 2026-07-15

All blockers resolved.

- **Blocker 1 (HIGH, dash-case `session-start`)** — FIXED. `status-machine.ts:68` now matches `session-start` alongside `SessionStart`/`sessionStart` → routes to the idle-seed instead of `work`/active.
- **Blocker 2 (MEDIUM, dash-case `notification`)** — FIXED. `status-machine.ts:58` now matches `notification` alongside `Notification`; empty-payload dash-case resolves to `ignore` (a pause), never active.
- **Blocker 3 (SCOPE, 12 reformatted files)** — FIXED. Reverted all 12 unrelated prettier-only files via `git checkout`; the diff is now scoped to N238 only. Prettier was re-run on the single touched file (`status-machine.ts`) only.
- **Test coverage** — added two `event-stream.test.mjs` cases: dash-case names route like CamelCase, and a dash-case `session-start` after a `Stop` does not flip `done → active`.
- **Gates:** `pnpm build` OK, typecheck clean, eslint 0 errors, **362/362** tests pass.

Non-blocking items (NB-1 `done`-toggle gating, NB-2 decay resume-lag / local-SSE) were **not** actioned — out of the fix scope and not authorized; left for a follow-up.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-15
**Verdict:** approved

### Summary

Human's exact words: "okej approved please pu it to done i can go to the release"

### Blockers

None.

### Suggestions (non-blocking)

None raised by the human. (AI-review NB-1 `done`-toggle gating and NB-2 decay resume-lag remain open as optional follow-ups.)

### Notes

Approved for release. Code is still uncommitted in the working tree — needs `/task-git` (commit + push + merge) before the release goes out and before the task can be recorded `merged`/`done`.
