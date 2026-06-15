# N122 — Project.entryAgents — flow identity via main/starter agent(s)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- Flows have no notion of an entry/owner agent — N96 computes a visual 'root' but nothing declares who starts a flow. The human wants a flow's **main/starter agent(s)** to identify it (so invoking a main agent picks that flow), and a flow with no main agent to be flagged 'not selectable by agent'.

## Goal

1. `ProjectSchema` gains `entryAgents: string[]` (validated subset of the flow's `agents`).
2. The shipped default flow declares its entry agents (`task-analyze`, `taskmaster`).
3. A flow with empty `entryAgents` is flagged in the UI/API as 'not selectable by agent' (still selectable by type/explicit).
4. The dashboard flow page shows the main agent(s); the editor lets you mark/unmark an agent as entry (multiple allowed).

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — `ProjectSchema.entryAgents` (subset-of-agents refinement).
- `agents/project/default.json` — declare entry agents.
- `dashboard/client/ProjectPage.tsx` + flow editor — show + edit entry agents; `/api/project[s]` expose them.
- Tests: schema subset validation; default flow entry agents; editor mark/unmark.

### Out of scope

- The binding logic (N123 consumes entryAgents). Custom agents as slash commands (N124).
- Multiple-flow disambiguation (N123).

## Implementation plan

1. **Schema** — `entryAgents` subset refinement; default.json declares them.
2. **API/UI** — expose + edit entry agents; flag empty as not-agent-selectable.
3. **Tests** — subset validation + default + editor toggle.

## Verification

- `pnpm build` + suite green; default flow reports its entry agents; a flow with none is flagged.
- Editor: mark an agent as entry → persists; unmark works.

## Notes

- Foundation of the main-agent selection model (N123). See N119/ANALYSIS.md.
- Multiple entry agents allowed (taskmaster + task-analyze).
