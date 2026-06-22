# N169 — Interactive terminal-node authoring in the flow editor — Analysis

**Created:** 2026-06-22
**Author:** task-analyze

## Problem framing

- N166 shipped terminal "done" nodes as a **data model + read view**: a flow edge's target may be a terminal status (`FlowStatus.terminal`), and `FlowMap` renders wired terminals as circle nodes. But they're only authorable by **hand-editing the flow JSON** — the `FlowEditor` can't add a terminal or draw an agent→terminal edge.
- Cause: the editor's draft model assumes **every node is an agent** — `FlowDraft.agents = currentNodes.map(n => n.id)` and `report()` derives agents/positions/edges/entryAgents from the canvas. Terminal nodes would pollute `agents`, and there's no affordance to create a terminal status or connect to it.

## Goal

1. Add terminal nodes to the editor canvas (rendered like the read view's circles).
2. Create a terminal outcome inline (name + optional colour → a `FlowStatus` with `terminal: true`).
3. Draw an agent→terminal edge (the existing connect/trigger flow, targeting a terminal).
4. Persist terminals + their edges through the draft → ProjectPage save without corrupting the agent set.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Extend FlowDraft (separate agent vs terminal nodes) + "Add terminal" affordance + connect handling | Full in-editor authoring; matches N166 render | Touches FlowEditor (large), FlowDraft, ProjectPage save | M–L |
| B — Author terminals in a separate statuses editor; only *connect* in the flow editor | Smaller editor change | Two places to manage outcomes; clunky | M |
| C — Keep JSON-only authoring (status quo) | No work | The feature stays power-user-only | — |

## Decision

- Chosen option: **A**.
- Rationale: terminals already render in both `FlowMap` and the editor preview path (`computePositions` is shared); the missing piece is authoring. Doing it in the editor (where you already drag agents + draw edges) is the coherent home.

## Open questions

- `[blocking]` How to author the terminal **status** itself (name/colour)? A small inline form on "Add terminal", or reuse a flow-statuses editor if one is added. The draft must carry the new `statuses[]` (terminal) entries, which ProjectPage currently does not collect.
- `[non-blocking]` Tag terminal nodes (e.g. `node.type`/`data.kind`) so `report()` excludes them from `agents` and the entry-toggle/relabel effects skip them.
- `[non-blocking]` Removing a terminal (and its incident edges); preventing an agent's "set as start point" menu on a terminal node.

## Sources

- `components/FlowEditor.tsx` (draft model, `report`, `addAgent`, `onConnect`, node menu), `components/FlowMap.tsx` (N166 terminal render), `core/schema` `FlowStatus.terminal`, `ProjectPage.tsx` (draft→save) — provenance: analyzer-discovered, trust: high, fetched: 2026-06-22.

## Handoff brief

- Title: Interactive terminal-node authoring in the flow editor · type: feat · priority: medium. Let users add terminal "done" nodes and draw agent→terminal edges in the FlowEditor (today terminals only render / are JSON-authored). Requires separating terminal nodes from the agent set in `FlowDraft`/`report()`, an "Add terminal" affordance that creates a `terminal` `FlowStatus`, and persisting terminals + edges via ProjectPage save. Completes N166.
