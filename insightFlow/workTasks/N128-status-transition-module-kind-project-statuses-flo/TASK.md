# N128 — status-transition module kind + Project.statuses (flow status set)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- Statuses are canonical and hardcoded: the transition commands set fixed literals, and N112 only added display ALIASES (`mapsTo` canonical). To reach full custom statuses safely, status transitions must become DATA — a module that declares 'this agent sets status X' — and a flow must declare its own status SET, with the default flow's set equal to today's canonical enum (zero change).

## Goal

1. New **`status-transition`** module kind declaring an agent's completion status (e.g. `{ kind: 'status-transition', agent, sets: <statusId>, from?: <statusId> }`) — part of the LOCKED tier (N119).
2. `ProjectSchema.statuses`: an ordered status set for the flow — `{ id, title, color?, terminal? }`; the shipped **default flow's `statuses` = today's canonical enum** (byte-equivalent behavior).
3. Validation: a flow's transition modules + flow edges + N112 states reference only statuses in its own `statuses` set.
4. No engine behavior change yet — this defines the data; Epics 4-tail/5 consume it.

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — `status-transition` module kind in `AgentModuleSchema`; `ProjectSchema.statuses` (ordered) + the subset/refinement validation.
- `agents/project/default.json` — declare the canonical `statuses` set.
- `agents/user-registry.ts` — mark `status-transition` ids as LOCKED (N119).
- Tests: schema (transition module, statuses set, edge/state references constrained to the set); default flow's canonical set.

### Out of scope

- Rendering the kanban from these (N129). Status styling (N130). The actual transition engine + pickers (N131/N132/N133).
- Changing how tasks are stored yet (Task.status stays a string; validation against the flow comes in N131).

## Implementation plan

1. **Module kind** — add `status-transition` to the discriminated union.
2. **Flow statuses** — `ProjectSchema.statuses` ordered set; default.json canonical; refine edges/states/transitions ⊆ statuses.
3. **Lock** — transition modules join the LOCKED set.
4. **Tests** — schema validation matrix + default canonical set.

## Verification

- `pnpm build` + suite green; default flow declares the canonical statuses; a custom flow with an out-of-set trigger fails validation.
- A `status-transition` module validates; locked.

## Notes

- The pivot of full custom statuses — transitions as data. Depends on N119 (locked). Consumed by N129–N133. See N119/ANALYSIS.md.
- Staged so the default flow is unchanged (canonical set).
