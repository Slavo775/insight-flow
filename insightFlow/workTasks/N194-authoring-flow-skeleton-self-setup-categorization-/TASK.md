# N194 — Authoring flow skeleton + self-setup categorization (second built-in flow)

**Type:** feat
**Priority:** high
**Created:** 2026-06-26

## Problem

insight-flow ships one built-in flow (the default task lifecycle). There is no guided lifecycle for **authoring insight-flow's own customizations** — designing and building custom modules / agents / flows. The composer MCP (N188) + subagents (N190/N191) make it possible; this task lays the **backbone**: a second built-in flow plus a way to tell its tasks apart from product work.

## Goal

1. Ship a second **built-in flow** (e.g. id `composer-authoring`) governing the authoring lifecycle.
2. Make its tasks filterable as a **"self-setup" category** via `flowId` (no new task `type`).
3. Wire the lifecycle graph: entry agents, statuses, and edges — including the gated `create → analyze` re-entry and the terminal `install` step.

## Scope

### In scope

- **Flow definition** — a new shipped `Project` (`src/agents/project/*.json`, registered alongside `default.json`). Agents (placeholders resolved by N195): `analyze → create → implement → review → (fix) → human-review → test → install → done`. Statuses: reuse canonical where possible; add authoring-specific states only if needed.
- **Entry agents** — `analyze` (primary) and `create`; starting at `create` triggers its **gated** handover to `analyze` first (N195 supplies the handover module/edge; this task declares the edge).
- **Categorization** — the flow is the "self-setup" filter: tasks carry its `flowId`. Add/confirm dashboard + `list`/`next` filtering by flow so authoring tasks are separable from product tasks. **No new task-type enum.**
- **Terminal `install` step** — an edge to the `install` agent gated on human-review approval; ends at a terminal `done` node.
- Register the flow in the merged registry so it appears in the dashboard Flows browser and is selectable for new tasks (`--flow`/`set-default-flow` aware).

### Out of scope

- The agents themselves (N195) and subagents (N196) — this task uses placeholders/ids.
- The composer-MCP wiring (N197).
- Any new task `type` (rejected — categorization is `flowId`-based).

## Implementation plan

1. **Author the flow JSON** — agents list, `flow` edges (with `when` intent + auto/gated modes), `entryAgents`, `statuses`, terminal `done` node; register it (built-in project, like `default.json`).
2. **Gated create→analyze edge** — declare the edge so an author who starts at `create` is sent to `analyze` first (gated; not an auto cycle).
3. **install step** — edge to `install` triggered post-approval; terminal node after.
4. **Categorization/filtering** — verify `flowId` distinguishes authoring tasks; surface a filter in the dashboard Flows/Kanban + `list --flow`.
5. **Tests** — flow loads/validates (`project`/`user-registry` load), edges resolve, entry agents correct, terminal node honored.

## Verification

- The new flow appears in `/api/projects` + the dashboard Flows browser; a task can bind to it (`create --flow composer-authoring`).
- Authoring tasks are filterable by `flowId` (dashboard + `list`).
- `pnpm --dir packages/taskflow test` green (flow load + edge resolution); `tsc`/`lint` clean.

## Notes

- Decision trail + the full initiative plan: this folder's `ANALYSIS.md`.
- Foundations: N188 (composer MCP), N190 (subagents), N191 (orchestrators), N189 (handover `when`).
- Sibling tickets: **N195** (agents), **N196** (subagents), **N197** (MCP wiring). Build order N194 → N195 → N196 → N197.
- Agents resolved in N195 are placeholders here; this task may temporarily reference ids that N195 creates — sequence accordingly (land N195's agent defs before the flow validates against them, or stub minimal agents).
