# N169 — Interactive terminal-node authoring in the flow editor

**Type:** feat
**Priority:** medium
**Created:** 2026-06-22

## Problem

N166 shipped terminal "done" nodes as a data model + read view (FlowMap renders them; an edge may target a `terminal` status). But the FlowEditor can't author them — its draft model treats every canvas node as an agent (`FlowDraft.agents = node ids`). Today you create a terminal only by hand-editing the flow JSON.

## Goal

1. Add terminal nodes to the editor canvas (circles, like the read view).
2. Create a terminal outcome inline (name + optional colour → a `FlowStatus` with `terminal: true`).
3. Draw an agent→terminal edge via the existing connect/trigger flow.
4. Persist terminals + their edges through draft → save without polluting the agent set.

## Scope

### In scope

- `components/FlowEditor.tsx` — render terminal nodes; an "Add terminal" affordance; allow connecting agents to terminals; exclude terminals from `report()`'s agent set + the entry-toggle/relabel effects; node menu variant for terminals (remove, no "start point").
- `FlowDraft` (in `FlowEditor.tsx`) — carry terminal statuses alongside agents/edges.
- `ProjectPage.tsx` — persist the draft's terminal `statuses[]` + agent→terminal edges on Save.

### Out of scope

- The terminal data model / FlowMap rendering (shipped in N166).
- Full custom-status authoring beyond the terminal flag (states/statuses editor is a separate concern).

## Implementation plan

1. **Tag node kinds** — give canvas nodes a `data.kind: "agent" | "terminal"`; seed terminal nodes from `project.statuses.filter(s => s.terminal)`.
2. **report() split** — derive `agents` from agent-kind nodes only; collect terminal statuses + their positions separately; keep edges as-is (agent→terminal round-trips through `toFlowEdge`).
3. **Add terminal affordance** — a control that prompts for a name/colour, creates a `terminal` `FlowStatus`, and drops a terminal node on the canvas.
4. **Connect handling** — `onConnect` to a terminal opens the trigger picker (the status that reaches the terminal); validate like other edges.
5. **Node menu** — terminals get a "Remove terminal" action (drops the status + incident edges); suppress "set as start point".
6. **ProjectPage save** — merge the draft's terminal statuses into `project.statuses` and persist the edges.

## Verification

- `pnpm --dir packages/taskflow run build` + `test` pass.
- Manual: `pnpm play` → edit a flow → Add terminal "Done" → connect an agent to it on a trigger → Save → reload shows the terminal node + edge; the read-only FlowMap matches.

## Notes

- Completes N166 (data model + read view shipped). The editor's draft model is the crux — see ANALYSIS.md open questions (how to author the terminal status; tagging nodes so `report()` excludes them).
