# N144 — flow-diagram honesty — auto/gated badges + orphan-edge warnings

**Type:** feat
**Priority:** medium
**Created:** 2026-06-17

## Problem

- The model decided in /task-analyze is **agent wins, flow diagram is non-binding**: handovers live on agents (N142/N143); the project `flow` edges (`FlowEdge`, `core/flow-status.ts`) are a *diagram only*. That means the diagram can silently **lie** — an edge can show a handover the agents don't actually declare, or an agent can declare a handover the diagram never drew.
- The flow editor also has no way to show a handover's **mode** (auto vs gated), so a reader can't tell which transitions chain automatically and which pause for human go-ahead.

## Goal

1. Each edge in `FlowMap`/`FlowEditor` shows its handover **mode** (auto/gated) badge.
2. Edges that ARE backed by an agent's declared handover are visually distinguished from **orphan** edges that are not.
3. Orphan edges surface a clear, non-blocking warning so authors can reconcile the diagram with agent reality.
4. Pure presentation: no change to task behavior, status writes, or which handover an agent picks.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/FlowMap.tsx` — derive, per edge, whether a matching agent handover module exists (`from` agent declares a `handover` with the same `to` and `on`); style backed vs orphan edges differently; render a small auto/gated badge on the edge label.
- `packages/taskflow/src/dashboard/client/components/FlowEditor.tsx` — mirror the same badge/orphan styling in the editable canvas (`toReactFlowEdge`, edge `label`/`style`); show an inline warning list of orphan edges (reuse the existing `EditorError`/overlay styling).
- A small pure helper (e.g. in `core/flow-status.ts` or a client util) `isEdgeBackedByHandover(edge, agentHandovers)` so both map + editor share one rule and it's unit-testable.
- Read the agents' handover modules via the registry the client already loads (`registry.ts` / `api.ts`); no new endpoint if the data is already present, otherwise extend the project DTO to include resolved agent handovers.

### Out of scope

- No change to handover semantics, the `advance` command, or status writes.
- No making the diagram binding (explicitly rejected in /task-analyze).
- Module/agent editor CRUD (N143) and prompt wording (N145).

## Implementation plan

1. **Backing rule.** Add a pure `isEdgeBackedByHandover(edge, handovers)` helper: an edge `{from,to,on}` is backed iff agent `from` declares a `handover` module with matching `to` and (`on` equal or both absent). Unit-test it.
2. **Data availability.** Confirm the client already has each agent's resolved modules (via `registry.ts`); if not, add resolved handovers to the project DTO (`ProjectDto` in `api.ts`, populated server-side in `custom-defs.ts`/`index.ts`).
3. **FlowMap badges + styling.** In `toReactFlowEdge`-equivalent map rendering, append the mode badge to the label and apply a distinct style (color/dash) for orphan edges. Keep the existing label/trigger text.
4. **FlowEditor parity.** Apply the same in `FlowEditor.toReactFlowEdge` (`FlowEditor.tsx:215`); add an orphan-edge warning overlay (reuse `EditorError` styled component) listing `from → to` for each orphan.
5. **Legend/affordance.** Add a tiny legend or tooltip explaining auto vs gated and "orphan = not backed by an agent handover."

## Verification

- `pnpm --dir packages/taskflow run build` + `npx tsc --noEmit` pass.
- `pnpm --dir packages/taskflow test` passes incl. the new `isEdgeBackedByHandover` unit test.
- In `pnpm play` against a custom project: an edge matching an agent handover renders backed + correct mode badge; an edge with no backing agent handover renders as orphan and appears in the warning list.

## Notes

- Depends on **N142** (handover data) and **N143** (so agents can actually carry handovers to back edges).
- Reuse: `FlowEditor.tsx:215` (`toReactFlowEdge`), `FlowMap.tsx` `computePositions`, the `EditorError` overlay pattern, `core/flow-status.ts` for the shared pure rule.
- This is the explicit "diagram can lie" mitigation from /task-analyze — honesty only, no behavior change.
