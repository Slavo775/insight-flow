# N69 — stateful status transitions: only agent-active leaves idle/done; any event leaves awaiting-permission

**Type:** rework
**Priority:** medium
**Created:** 2026-05-28

## Problem

N68's status derivation is stateless: `deriveStatus()` takes the newest event by timestamp and runs `statusFromEvent()` on it in isolation. Every event whose type isn't `Stop` / `Notification` / `agent-idle` / `approval-required` falls through to `active` — so `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, etc. all wake a `done` or `idle` project, even when no actual agent work is happening (e.g. opening a new Claude session, /clear). The result is that `done` and `idle` are effectively unreachable beyond the instant they're set, and `awaiting-permission` cleanup is muddled.

## Goal

1. **The only path from `idle` or `done` to `active` is an `agent-active` event. No other event type can wake a sleeping project.** This is the headline rule of N69 — every other point below is in service of it.
2. Replace stateless "latest event wins" with a `(fromStatus, event) → toStatus` transition function so the from-state actually constrains the transition.
3. `awaiting-permission` is escape-on-any-event: as soon as any event arrives after a permission prompt, status flips to `active` (the user clicked allow, work resumes).
4. Terminal mappings unchanged: `Stop` / `SubagentStop` / `agent-idle` / `session-end` → `done`; `Notification`(permission) / `approval-required` → `awaiting-permission`; `Notification`(idle wording) → `idle`. These apply regardless of from-state — but they never land on `active`, so they don't conflict with rule 1.
5. Dashboard pill and master overview pick up the new transitions with no extra wiring — they already react to `status` WebSocket frames; the change is purely in derivation.

### Status transition matrix (authoritative)

| from \ event             | `agent-active` | terminal-done* | terminal-perm** | terminal-idle*** | any other |
|--------------------------|----------------|----------------|------------------|------------------|-----------|
| `idle`                   | **active**     | done           | awaiting-perm    | idle             | idle (stay) |
| `done`                   | **active**     | done (stay)    | awaiting-perm    | idle             | done (stay) |
| `awaiting-permission`    | active         | done           | awaiting-perm    | idle             | **active**  |
| `active`                 | active (stay)  | done           | awaiting-perm    | idle             | active (stay) |

\* terminal-done = `Stop` | `SubagentStop` | `agent-idle` | `session-end`
\*\* terminal-perm = `Notification`(payload.message matches `/permission/i`) | `approval-required`
\*\*\* terminal-idle = `Notification`(no permission match)

The two **bolded** cells are the new behavior; everything else either is already what N68 does or is a no-op consequence of the matrix.

## Scope

### In scope

- `packages/taskflow/src/server/event-stream.ts`
  - Replace `deriveStatus(events)` with a transition function: `nextStatus(from: ProjectStatus, event: HookEventInput): ProjectStatus`.
  - `EventStore.insert()` calls `nextStatus(this.status, event)` instead of `deriveStatus(this.events)`.
  - `statusFromEvent()` stays as a helper but is *only* used for "always-applies" events (terminal/notification types). Generic events check from-state first.
- `packages/taskflow/src/server/index.ts`
  - No API change; just consume the new transition behavior via `EventStore`.
  - Master-forwarder path at lines ~705–725 must keep using the same derivation (it already funnels through `statusFromEvent`); update it to use `nextStatus` so legacy callers behave identically.
- Tests: add a focused unit test file `packages/taskflow/test/event-stream.test.mjs` (or extend the closest existing file) covering the new transition matrix.
- No frontend changes required — dashboard already maps `'agent-active'` action to UI state `'active'`.

### Out of scope

- Renaming the status enum (`active` stays `active`; we are not adding a `agent-active` *status* — `agent-active` is an *event* name that triggers the transition).
- Idle-timeout / crash-recovery (still punted from N68).
- Per-task `events.json` writers.
- Sound / browser-notification logic (already correct: fires on `→ done` / `→ awaiting-permission`).
- Master schema changes.

## Implementation plan

1. **Define the transition matrix** in `packages/taskflow/src/server/event-stream.ts`.
   - Add a top-of-file comment summarising the rules below.
   - "Always-applies" events (terminal regardless of from-state):
     - `Stop` | `SubagentStop` | `agent-idle` | `session-end` → `done`
     - `Notification`(payload.message matches `/permission/i`) | `approval-required` → `awaiting-permission`
     - `Notification`(idle wording, i.e. no permission match) → `idle`
   - "Conditional" events (depend on from-state) — these are the ONLY routes to `active`:
     - If `from === "awaiting-permission"`: any non-terminal event → `active` (user approved, resume).
     - If `from === "idle"` or `from === "done"`: **`agent-active` is the only event that transitions to `active`.** Every other non-terminal event keeps `from` unchanged. No exceptions, no soft fallbacks.
     - If `from === "active"`: any non-terminal event → stay `active`.

2. **Implement `nextStatus(from, event)`** as a pure function next to `statusFromEvent`. Internally: first check the always-applies branches; if none match, apply the conditional rules. Keep `statusFromEvent` exported (still used by the master-forwarder path in `index.ts`).

3. **Update `EventStore.insert()`** to call `nextStatus(this.status, event)` *before* the line that currently does `this.status = deriveStatus(this.events)`. Drop or inline `deriveStatus` (keep `deriveStatus` as a thin wrapper that folds `nextStatus` over the buffer for cold-start replay only — call sites that previously called `deriveStatus` directly on a fresh buffer should still work).

4. **Cold-start replay** — when `EventStore` is constructed from a non-empty buffer (e.g. future persistence reload), it must fold `nextStatus` starting from `"idle"` over the buffer in timestamp order to arrive at the correct current status. Today the store starts empty so this is a future-proofing concern only; one line in the constructor / a `replay(events)` method is enough.

5. **Master-forwarder parity** in `packages/taskflow/src/server/index.ts` (lines ~700–725 — the legacy hook path that translates dash-case actions). Replace its call to `statusFromEvent` with `nextStatus(currentMasterPushStatus, event)` so the master overview sees the same transition logic. If tracking the previous status there is awkward, route it through `EventStore` instead of recomputing locally.

6. **Tests** — `packages/taskflow/test/event-stream.test.mjs` (Node `node:test`).
   Headline rule needs explicit coverage: **only `agent-active` can move `idle`/`done` to `active`.** Sweep the non-`agent-active` event types and assert no transition.
   - `idle + agent-active → active` ✅ (the only path).
   - For each of `SessionStart` / `session-start` / `PreToolUse` / `tool-requested` / `PostToolUse` / `tool-approved` / `UserPromptSubmit` (raw) / generic `Notification`(empty payload) / `subagent-done`: assert `idle + <evt> → idle` and `done + <evt> → done`. Parameterize so adding new event types in the future just extends the table.
   - `done + agent-active → active`.
   - `awaiting-permission + PostToolUse → active`.
   - `awaiting-permission + UserPromptSubmit → active`.
   - `awaiting-permission + agent-active → active`.
   - `active + Stop → done`.
   - `active + Notification("Claude needs your permission") → awaiting-permission`.
   - `active + Notification("waiting for input") → idle`.
   - `awaiting-permission + Notification("permission again") → awaiting-permission` (stays).

7. **Smoke verification** — start `pnpm play`, open a Claude Code session in `playground/`, watch the project pill in the dashboard:
   - After Stop → `done`. Run `/clear` (triggers SessionStart) → pill stays `done` (regression of the old behavior).
   - Type a prompt that maps to `UserPromptSubmit` → pill flips to `active` (because UserPromptSubmit is mapped to `agent-active` in the hook-name table at `cli.ts:201`).
   - Trigger a permission prompt → `awaiting-permission`. Approve → next hook event flips back to `active`.

## Verification

- `pnpm --dir packages/taskflow test` passes, including new event-stream cases.
- `pnpm --dir packages/taskflow run build` (or `npx tsc --noEmit`) passes.
- Manual smoke per Implementation plan step 7.
- Inspect `/log/status` after each smoke step to confirm the in-memory status matches expectations.

## Notes

- Builds directly on N68 (introduced the four-state model + `/log/events`). N69 is purely a derivation-logic change; no API / schema / frontend changes.
- `cli.ts:201` (`RAW_TO_DERIVED`) is the source of truth for which Claude Code hook events get the `agent-active` *event name* — currently only `UserPromptSubmit`. If we later want `PreToolUse` to also wake the project, we change the mapping there, NOT in `nextStatus`. This separation keeps the transition function event-name-driven.
- Dashboard mapping at `dashboard.ts:499-505` already treats `agent-active` and `tool-approved` actions as `active` for the per-event UI hint — unchanged by this task.
