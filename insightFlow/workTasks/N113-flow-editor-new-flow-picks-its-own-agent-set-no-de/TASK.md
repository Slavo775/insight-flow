# N113 — Flow editor — new flow picks its own agent set (no default inheritance)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- `ProjectForm` (`packages/taskflow/src/dashboard/client/ProjectForm.tsx`) prefills every new flow with the default project's full agent set — `agents: base.agents` is copied even on the non-duplicate path, so a 'new' custom flow is born with all 10 lifecycle agents the author probably did not want. The point of a custom flow is a *different* agent set.

## Goal

1. The New-flow form lets the author pick the flow's agents up front via a multi-select of composed agents (built-in + custom from the registry), defaulting to **none** selected.
2. A non-duplicate new flow is created with exactly the picked agents, `flow: []`, and `install: []` — no inheritance from the default.
3. A 'pick at least one agent' form check blocks submit when nothing is selected (keeps the record valid against `ProjectSchema` `agents.min(1)` — schema unchanged).
4. The existing 'Duplicate from default' checkbox is unchanged: when checked it still copies the default's agents + flow + install verbatim.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/ProjectForm.tsx` — replace the unconditional `agents: base.agents` with the picked set on the custom path; add the agent multi-select (reuse the registry hook from N93/N107: `useRegistry()` → `registry.agents`).
- Form state for selected agent ids + the 'at least one agent' validation message (inline, like the existing id/title errors).
- The multi-select is hidden/ignored when 'Duplicate from default' is checked (that path needs no picker).

### Out of scope

- Editing the agent set of an existing flow (N114 owns add/remove in the editor).
- Any `ProjectSchema` change (min(1) stays).
- Changing the default project or the duplicate-from-default behavior.

## Implementation plan

1. **Form state** — add `selectedAgents: string[]` (default `[]`); render a checkbox/multi-select list from `registry.agents` (id + pretty title, custom ones flagged) only when not duplicating.
2. **Submit** — custom path builds `{ agents: selectedAgents, flow: [], install: [] }`; duplicate path unchanged (`base.agents/flow/install`).
3. **Validation** — if not duplicating and `selectedAgents.length === 0`, set an inline error and block submit before the API call.
4. **Smoke** — create a custom flow with 2 hand-picked agents; confirm `/api/project?id=` returns exactly those 2 agents, empty flow, empty install.

## Verification

- `pnpm build` + suite green.
- Playground: New flow (not duplicating) with no agents selected → blocked with an inline message; with 2 selected → created with exactly those agents and an empty map.
- Duplicate-from-default still produces the full default agent set + edges (unchanged).

## Notes

- Decisions from /task-analyze: pick agents up front (not prefilled), schema stays `min(1)`. Builds on N108 (ProjectForm) + N93/N107 registry.
- N114 makes the agent set editable after creation; this task only fixes creation.
