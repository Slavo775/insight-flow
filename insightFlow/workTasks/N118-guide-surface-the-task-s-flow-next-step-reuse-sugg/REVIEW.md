# N118 — Guide: surface the task's flow + next step — Review

Anchors the AI review for **Round 1 "Guide" (N116–N118)** — flows become a real,
correctable, visible task property — reviewed as a unit.

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-15
**Verdict:** approved

## Summary

N116 (Task.flowId + type→flow map), N117 (set-flow + dashboard reassignment,
ready-only), N118 (surface the task's flow + next step) all implement their specs
and the settled decisions (shared-master-picks-by-type, change-only-while-ready,
guide-not-drive). Build green, 179/179, typecheck/lint/format clean. No blockers.

## Checklist verification

- **N116** — `Task.flowId` (schema default + the `Task` interface; legacy tasks read back as
  `default`); `flows.byType` + `defaultFlow` config merged so a user setting only `byType`
  keeps `defaultFlow`; `create` resolves `--flow` → `byType[type]` → `defaultFlow`, unknown →
  `default` non-fatally; `flowId` in the create output + task payloads. Pass.
- **N117** — shared `setTaskFlow` core (exists / `ready` only / flow-exists) behind both the CLI
  `set-flow` and `POST /api/task-flow` (200/400/404/409); dashboard dropdown enabled only while
  ready, graceful for a deleted flow, reverts on error. Pass.
- **N118** — task-page map + suggestions read the task's `flowId` (default fallback if missing);
  `current`/`next` carry `flowId` + `nextSteps`; the `next`/`next-review` picker order
  (`STATUS_WEIGHT`) is provably untouched (a test asserts the pick is identical). Pass.

## Blockers

None.

## Non-blocking

1. **No request-level error boundary on the dashboard server (pre-existing pattern; recommend a
   follow-up hardening task).** `createServer((req, res) => …)` has no top-level try/catch, and
   N117's `/api/task-flow` calls `jsonFileStorage.loadMaster(config)` inside the `req.on("end")`
   callback outside a guard — a malformed/missing `master.json` would throw unhandled and crash
   the long-running dashboard. This is **consistent with the existing server** (sibling endpoints
   read `getWorkDir`/`loadMaster` equally unguarded), so it's not specific to N117 — but the
   trigger is realistic (master.json went transiently malformed several times this session during
   merges). The proper fix is server-wide: wrap the request handler + async body callbacks to
   return 500 instead of crashing. Recommend a small task.
2. **`/api/task-flow` oversize body (>16KB) calls `req.destroy()` without sending a response →
   the request hangs** (no `aborted` guard like custom-defs' `readBody`). Not practically reachable
   for a `{id, flow}` payload; cosmetic.

## Security & edge cases

- Flow reassignment is double-guarded (client disables when not ready; server enforces ready-only
  + flow-existence), so a crafted POST can't change a non-ready task's flow.
- `flowId` is a free string validated only against existing flows on reassignment (N117) and
  resolved with a `default` fallback everywhere it's read (N116 create, N118 surfacing) — a
  dangling flowId never errors, it degrades.

## Notes

- `flowGuide`/`resolveFlowId`/`setTaskFlow` each call `mergedProjects()` (reads
  `insightFlow/projects/`) per invocation — fine for one-shot CLI commands; not a server hot path.
- Round 2 "Drive" (pickers/prompts read the flow; agent stage-vs-utility kinds) remains the
  deferred follow-on — see N116/ANALYSIS.md.
- `master-boot.test.mjs` flaked once mid-round (fetch failed), passed in isolation + on rerun.
