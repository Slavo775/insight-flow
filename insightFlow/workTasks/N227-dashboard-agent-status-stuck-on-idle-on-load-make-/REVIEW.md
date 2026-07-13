# N227 — Dashboard agent status stuck on idle on load — make backend the single source of truth over SSE — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-13
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Makes the server's `eventStore` the single source of truth for the agent active/idle badge: seeds it from the durable activity log at startup, ships the derived status in the SSE snapshot + master push, and has both UIs display it (removing the duplicated client `claudeStatusFromEvent` and the master's independent derivation). The core fix works and was verified end-to-end (fresh dashboard boot returned `agentStatus: "active"` from a seeded log). **Risk: medium** — one real correctness gap makes the newly-authoritative status misclassify agent-lifecycle terminal events as "active". Wiring, ordering, `activitySeq` reuse, reconnect behavior, and master field separation all verified clean.

## Checklist verification

- [x] Dashboard shows correct active/idle on first load — pass (verified via real SSE snapshot; but see Blocker 1 for the lifecycle-terminal case)
- [x] Initial SSE snapshot includes derived status — pass (`index.ts:1686`)
- [x] EventStore seeded from durable log on startup — pass (`index.ts:695-702`)
- [x] Client `applySnapshot` seeds `agentStatus` from snapshot — pass (`store.ts:79-86`, additive optional param)
- [x] Master uses backend-provided status — pass (`overview.ts:557` prefers `s.agentStatus`, falls back for older payloads)
- [x] One authoritative derivation; duplicates removed — pass (`claudeStatusFromEvent` deleted, no dangling refs)
- [x] Transport unchanged (SSE); no websocket, no persisted status file — pass
- [~] Correct on restart — partial: correct when newest classifiable row is a hook row; **wrong** when it's an agent-lifecycle `done`/`idle` (Blocker 1)

## Blockers

1. **Agent-lifecycle `done`/`idle` events misclassify as "active"** — `packages/taskflow/src/dashboard/server/index.ts:456-466` + `packages/taskflow/src/dashboard/server/event-stream.ts:11-27`.
   - **Why:** `activityRowToHookEvent` forwards every `tool === "Event"` row into `eventStore` (the `source`-based "hook-sourced" wording in the call-site comments is unenforceable — the server `ActivityEvent` type has no `source` field). Agent-emitted lifecycle rows carry bare names (`start`, `done`, `active`, `idle`, `edit-start`, …). `statusFromEvent` has no case for bare `done`/`idle`, so they hit the `return "active"` default. Since N227 promotes `eventStore.getStatus()` to the single source for the badge and seeds it from the durable feed, a session whose newest classifiable row is a lifecycle `done`/`idle` (e.g. **hooks not installed** — the playground's own `Hook: both-missing` state) shows the badge **"active" while idle** — the inverse of the bug this task fixes.
   - **Fix (1 line):** teach `statusFromEvent` the lifecycle terminals — extend the done-group at `event-stream.ts:25` to `if (t === "agent-idle" || t === "session-end" || t === "idle" || t === "done") return "done";`. The working lifecycle names (`edit-start`, `research-end`, …) correctly keep falling through to `"active"`. Re-verify: seed a log whose newest row is `{"tool":"Event","action":"done"}` → snapshot `agentStatus` should be `"idle"`.

## Non-blocking

1. Dead guard: `typeof event.action !== "string"` in `activityRowToHookEvent` (`index.ts:457`) can never be false — `ActivityEvent.action` is a required string (`core/types.ts:315`). Harmless; optionally simplify to the `tool` check only, or leave as defensive code.
2. The call-site comments at `index.ts:1708-1711` say "hook-sourced" but the helper does not (and cannot) filter by source. If Blocker 1 is fixed by handling the vocabularies in `statusFromEvent` (rather than filtering), reword the comments to match.

## Security & edge cases

- No security surface — read-only status derivation over localhost SSE; no new inputs, auth, or persistence.
- `frame.to as ProjectStatus` cast (`useDashboardStream.ts`) is safe: values originate from `eventStore` (the four `ProjectStatus` values), and `claudeStatusFromProjectStatus` has a `default` branch.
- Reconnect: each SSE (re)connect re-emits a fresh snapshot, so the badge re-syncs after drops.

## Notes

- Independent correctness pass (review-correctness subagent) confirmed items 1–5 of the wiring clean; Blocker 1 is the only material finding, corroborated by the implementer's own analysis.
- Related: N225 (durable activity feed — the seed source), N83 (SSE, kept), N68 (eventStore origin).

---

## Fix — Round 1 (task-review-fix, 2026-07-13)

**Blocker 1 — resolved.** `packages/taskflow/src/dashboard/server/event-stream.ts:25` — extended the done-group so the bare agent-lifecycle terminals map to not-working:
```ts
if (t === "agent-idle" || t === "session-end" || t === "idle" || t === "done") return "done";
```
Working lifecycle names (`edit-start`, `research-end`, …) still fall through to the `"active"` default.

Verified end-to-end (real dashboard boot + live SSE snapshot):
- newest row `{"tool":"Event","action":"done"}` → `agentStatus: "idle"` (was `"active"` before fix)
- newest row `{"tool":"Event","action":"idle"}` → `agentStatus: "idle"`
- newest row hook `agent-active` → `agentStatus: "active"` (no regression)

Build (tsc + vite) and eslint pass.

**Non-blocking items — not actioned** (per fixer scope: blockers only). Item 1 (dead `typeof action` guard) and item 2 (the now-inaccurate "hook-sourced" wording in `index.ts:1708-1711` comments — the fix handles vocabularies in `statusFromEvent` rather than filtering by source) are left for a follow-up or a maintainer's discretion.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-13
**Verdict:** approved

> "merge it into base fix approved"

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

- Merge instruction: merge N227 into the base branch `fixes` (same base used for N226). To be carried out in the `/task-git` step.
