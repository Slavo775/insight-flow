# N253 — Delete confirmed dead code across dashboard-server, UI, agents, master — Analysis

**Created:** 2026-07-18
**Author:** task-analyze

## Problem framing

A whole-repo ponytail audit (4 parallel scanners, one per area: master, dashboard-server, UI, agents) was asked to find dead code, duplication, and antipatterns. The genuinely **dead** findings are small but scattered, and each was grep-confirmed to have zero callers. They are low-risk removals with a real payoff: shrinking the surface that the N254 http-util refactor must touch, and removing three HTTP endpoints that are pure attack/maintenance surface with no consumer.

## Goal

- Remove only what is grep-confirmed dead; change no behavior any caller depends on.
- Leave the codebase's shard/hydration/SSE logic untouched (that is N254).

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Separate deletion task, done first | Zero-risk wins land immediately; smaller surface for N254; clean git history | One more task to track | S |
| B — Fold deletions into the N254 refactor | One PR | Mixes zero-risk deletes with a risky refactor; easy wins blocked on hard work; harder review | — |
| C — Leave dead code | No effort | Dead endpoints stay as surface; audit rots | — |

## Decision

- Chosen option: **A**
- Rationale: deletions are independent and zero-risk; bundling them into N254 (Option B) would gate 20-minute wins behind a careful two-server refactor and muddy its diff. Do this first so N254 operates on a smaller surface.

## Open questions

- `[non-blocking]` The audit is a 2026-07-18 snapshot — re-run each `grep` at implement time; if a symbol gained a caller, leave it and note it in the checklist.
- `[non-blocking]` `validateReferences` may still have internal-only callers inside `custom-defs.ts`; if so, only drop the `export` + barrel line, don't delete the function.

## Sources

- None — discussion was self-contained. Findings came from the in-repo ponytail audit (4 general-purpose scanner subagents, 2026-07-18), not external references.

## Handoff brief

Delete confirmed dead code across dashboard-server, UI, agents, master. type: chore, priority: medium, tags: dead-code, cleanup. Remove 3 unused dashboard endpoints (`/log/status`, `/api/session-events`, `/api/events?taskId=`), the `validateReferences` export, UI `SEVERITY_CLASS` + `statusTone` export, agents `detectNotifyHookStatus` + `flowInstallPlan`/`flowRequiredInputs` wrappers, and master `projectsHomeRoot` + dead `"[::1]"` line — each re-confirmed via grep before deletion. Pure removal, no behavior change; gates must stay green.
