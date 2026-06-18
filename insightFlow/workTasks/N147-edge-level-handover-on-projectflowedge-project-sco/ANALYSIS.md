# ANALYSIS — edge-authored handovers (round N147–N150)

_Pre-taskmaster strategy record. Follow-up evolution of the N142–N146 handover round, prompted by the owner clarifying the intended UX._

## Problem framing

The N142–N146 round modeled handover as a **separate agent module** plus a **separate descriptive flow edge** — a two-step model that orphans easily (the owner's `is-test` flow showed red/neutral edges because the diagram edge wasn't "backed" by an agent module). What the owner actually wanted: when you **wire a relation between agents** (flow editor or agent editor), pick **"status change" vs "handover to this agent"**, and choosing handover **builds the agent with a `## Handover` section** (with/without explicit user approval = gated/auto). I.e. authoring the edge **is** authoring the handover.

## Goal

Make the relation/edge the authoring surface for handovers: choosing "handover" on an edge generates the source agent's handover section (auto/gated), project-scoped so it works even for built-in source agents — without re-introducing the orphan two-step.

## Options considered (decisions)

1. **Authoring model** → **Edge authors the handover (write-through).** The flow editor becomes the authoring surface; picking handover materializes the section. (Rejected: keep edge + agent module separate — that's today's orphan-prone model.)
2. **Where the handover lives when the source is a built-in/locked agent** → **Project-scoped (on the flow edge), composed into the agent's prompt at install time.** Built-in agents stay globally untouched. (Rejected: eject a per-flow agent copy — clutters user-space; restrict to custom sources — excludes most default-flow edges.)
3. **status-change vs handover** → **Independent, composable.** A relation may carry a trigger (`on`) AND/OR a handover (`mode`). Matches the default flow where implement→git is both on `implemented` and an auto handover. (Rejected: mutually exclusive — can't model that case.)
4. **Canonical handovers** → **Keep global on agents (N142 untouched).** Edge-handovers are purely additive for custom/project-specific routing. (Rejected: move all onto default-flow edges — reworks N142 + regenerates `*_ROLE.md` again.)

## Decision

Edge gains `handover?: { mode: "auto"|"gated" }` (project-scoped, trigger-independent). Two scopes: **agent editor → global agent-module handover (N142)**; **flow editor → project-scoped edge handover (new)**. Install-time composition merges both into the agent's emitted `## Handover` section. The N144/N146 orphan cross-check is superseded (an edge with `handover` is self-defined). Sliced into 4 tasks:

- **N147** — edge-level `handover` on `ProjectFlowEdge` (schema + types). Foundation.
- **N148** — flow-editor relation picker: status-change vs handover + auto/gated, write-through to the edge.
- **N149** — install-time composition: emit each agent's `## Handover` from flow edges merged with global handovers (built-in agents get it per-flow; global role MD untouched).
- **N150** — diagram reconciliation: edges self-define; retire the orphan/builtin-source cross-check.

Build order: **N147 → (N148 ∥ N149) → N150.**

## Open questions

- Exact "Handover to this agent" picker wording/placement (N148 — implementer's judgment within existing styles).
- Whether `edgeHandover`/`isEdgeBackedByHandover` survive in any form after N150 (N149 may keep a minimal matcher for install composition) — coordinate symbol removal across N149/N150.
- Agent-editor relation wiring parity (N148) — flow editor is primary; mirror only if the agent editor exposes relation wiring.

## Sources

- `core/schema/index.ts` `ProjectFlowEdgeSchema` (~:429); `core/flow-status.ts` `FlowEdge`/`resolveTrigger`/`edgeHandover`/`classifyEdge` (N144/N146); `dashboard/client/api.ts` `ProjectDto.flow`.
- `dashboard/client/components/FlowEditor.tsx` (PickerOverlay/EdgeModal/toReactFlowEdge/FlowDraft), `FlowMap.tsx`, `ProjectPage.tsx` (handoversByAgent/builtinAgents).
- `agents/compose.ts` `handoverSection`/`handoverAction` (N142/N145); `agents/flow-install.ts` + N126 install endpoint (`dashboard/server/index.ts`); `agents/emit.ts`/`collectArtifacts`.
- Repro: `is-test/insightFlow/projects/test-its-working.json` (taskmaster→test-agent on `test-ready`).

## Handoff brief

4-task round (N147 high, N148–N150 medium; N150 rework). Edge gains project-scoped `handover{mode}`, trigger-independent; flow editor authors it; install-time composition builds the agent section (merged with N142 global, built-ins included); diagram reconciled to self-defining edges. Canonical handovers stay global. Build N147 → (N148 ∥ N149) → N150.
