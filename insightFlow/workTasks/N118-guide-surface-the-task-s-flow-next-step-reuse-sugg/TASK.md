# N118 — Guide — surface the task's flow + next step (reuse suggestNextSteps)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- A task now knows its flow (N116) and can be corrected (N117), but nothing USES the flowId yet — it's a label. The task map (N104) and next-step suggestions (N105) are still hardwired to the default flow. This task makes the Guide real: the dashboard and CLI show the task's OWN flow and the next agent(s) for its current status — the human still invokes, no picker or state-machine change.

## Goal

1. The task-detail map (N104 `currentFlowNodes`) and next-step suggestions (N105 `suggestNextSteps`) resolve the **task's** `flowId` (its project flow) instead of always the default; a missing/unknown flow falls back to the default flow gracefully.
2. `insight-flow current` and `insight-flow next` output include the task's flow id and the computed next agent(s) for its status (e.g. `Next per custom:hotfix: /task-git`).
3. Suggestions/handoff stay advisory — the `next`/`next-review` pickers and the status machine are untouched (that is the deferred Drive round).
4. Reuses the existing pure helpers `currentFlowNodes` / `suggestNextSteps` (`core/flow-status.ts`) — no new flow logic.

## Scope

### In scope

- `packages/taskflow/src/dashboard/server/index.ts` — `GET /api/project` (or the task-page data path) resolves the requested task's flow; the client passes the task's `flowId` when fetching the project for the map.
- `packages/taskflow/src/dashboard/client/TaskDetailPage.tsx` — fetch the task's flow (by `task.flowId`) for the lifecycle map + suggestions instead of the default.
- `packages/taskflow/src/cli/commands/query.ts` (or `current`) — append the flow id + `suggestNextSteps(flow, status)` result to `current`/`next` output.
- Tests: a task on a custom flow shows that flow's next-step; a task whose flow was deleted degrades to default; CLI output carries flow + next.

### Out of scope

- Changing the `next`/`next-review` picker ORDER or the status machine (Drive round). Agent stage-vs-utility kinds (Drive). Auto-invoking the next agent (explicitly never).
- New flow-computation logic — only reuse N104/N105 helpers.

## Implementation plan

1. **Resolve task flow** — server resolves `task.flowId` → that project flow (default ∪ custom, via the N108 loader); fall back to default if missing.
2. **Task map + suggestions** — `TaskDetailPage` requests the project by the task's flowId so `currentFlowNodes`/`suggestNextSteps` run against the right flow.
3. **CLI surfacing** — `current`/`next` payloads gain `flowId` + a `nextSteps` array (agent id + command + trigger) from `suggestNextSteps`.
4. **Graceful** — unknown/deleted flow → default, with a note in the payload.
5. **Tests** — custom-flow next-step, deleted-flow fallback, CLI output shape.

## Verification

- `pnpm build` + suite green.
- Playground: a task bound to `custom:hotfix` shows the hotfix map + hotfix next-step on its page and in `insight-flow current`; a task on `default` is unchanged; a task whose flow was deleted falls back to default.
- `next`/`next-review` pickers behave exactly as before (no ordering change).

## Notes

- Decisions (/task-analyze 2026-06-15): Guide only this round (surface, don't drive); reuse N105's engine. Depends on N116 (+ benefits from N117). Drive (pickers/prompts read the flow, agent kinds) is Round 2 — see N116/ANALYSIS.md.
- Optional follow-up (not this task): `prompt-build` appends 'Next per <flow>: /agent' to role outputs.
