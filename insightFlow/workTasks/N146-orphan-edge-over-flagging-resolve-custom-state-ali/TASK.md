# N146 — orphan-edge over-flagging — resolve custom-state aliases + soften built-in-source edges

**Type:** fix
**Priority:** medium
**Created:** 2026-06-18

## Problem

- N144's orphan-edge detection over-flags valid custom flows as red `⚠ orphan`, making custom-flow authoring look broken. Surfaced while testing in the `is-test` project's "Test its working" flow.
- **Bug:** `edgeHandover` / `isEdgeBackedByHandover` (`core/flow-status.ts`) compare the edge's **raw** trigger to the handover's trigger. A custom-state-triggered edge (e.g. `on: "test-ready"` where the flow declares state `test-ready` `mapsTo: ready`) never matches a handover declared on `ready`, so it is falsely flagged orphan even when a real backing handover exists.
- **UX:** an edge whose **source** agent is a locked/built-in agent can *never* be backed (its handovers are locked and uneditable), so it always renders red `⚠ orphan` — an "error" the user cannot act on. This should read as informational, not broken.

## Goal

1. `edgeHandover`/`isEdgeBackedByHandover` resolve the edge trigger through the flow's `states` (via the existing `resolveTrigger`) before comparing, so custom-state aliases match canonical handover triggers.
2. Edges whose source agent is built-in/locked render with a neutral "not backed (built-in)" style + label, distinct from the red `⚠ orphan` used for genuinely-fixable custom-source edges.
3. A genuine orphan on a *custom*-source agent still renders red `⚠ orphan`.
4. Tests cover both alias resolution and built-in-source classification; no change to handover semantics or status writes.

## Scope

### In scope

- `packages/taskflow/src/core/flow-status.ts` — add an optional `states?: FlowStateDef[]` param to `edgeHandover` (and `isEdgeBackedByHandover`); resolve `edge.on` via `resolveTrigger(edge.on, states)` before comparing to `h.on` (handover `on` is already canonical). Keep back-compat: absent `states` behaves as today.
- `packages/taskflow/src/dashboard/client/components/FlowMap.tsx` and `FlowEditor.tsx` — pass `project.states` (FlowMap) / the draft `states` (FlowEditor) into `edgeHandover`; introduce a third edge classification — `backed` (mode badge), `not-backed-builtin` (neutral grey, e.g. "· not backed (built-in)"), `orphan` (red `⚠`, custom source) — and update the legend accordingly.
- `packages/taskflow/src/dashboard/client/ProjectPage.tsx` — provide a built-in-source signal to the two components: a `Set<string>` of built-in agent ids (or a classifier) derived from `registry.agents` where `source !== "custom"`, passed alongside the existing `handoversByAgent` prop.
- `packages/taskflow/src/dashboard/client/api.ts` — none expected (`AgentDto.source` already exists).
- `packages/taskflow/test/flow-status.test.mjs` — add cases.

### Out of scope

- No change to handover semantics, `advance`, status writes, the schema, or compose rendering.
- No change to the descriptive (agent-wins) model — the diagram stays non-binding.
- Do not attempt to make built-in agents' handovers editable (they remain locked).

## Implementation plan

1. **Resolve aliases in the helper.** In `flow-status.ts`, change `edgeHandover(edge, handoversByAgent, states?)` to compute `const trigger = resolveTrigger(edge.on, states)` and match `h.to === edge.to && (h.on ?? "") === (trigger ?? "")`. Update `isEdgeBackedByHandover` to forward `states`.
2. **Built-in-source classifier.** In `ProjectPage`, build `builtinAgents = new Set(registry.agents.filter(a => a.source !== "custom").map(a => a.id))` and pass it to `FlowMap` + `FlowEditor` (new optional prop, default empty set).
3. **Three-way edge classification.** In `FlowMap`/`FlowEditor` edge mapping: `ho = edgeHandover(e, handoversByAgent, states)`. If `ho` → backed (existing mode badge). Else if `builtinAgents.has(e.from)` → neutral "not backed (built-in)" (muted/grey stroke, no red ⚠). Else → red `⚠ orphan` (as today). Update the legend to show the three states.
4. **Tests.** In `flow-status.test.mjs`: (a) a custom-state edge (`on: "qa"`, state `qa` `mapsTo: approved`) is backed by a handover on `approved`; (b) without `states` it stays unmatched (back-compat); (c) classification helper/predicate for built-in source (if extracted).
5. **Verify** (see below).

## Verification

- `pnpm --dir packages/taskflow test` passes incl. the new alias + classification cases.
- `pnpm --dir packages/taskflow exec tsc --noEmit` and the client `tsc --noEmit -p src/dashboard/client/tsconfig.json` both clean; `pnpm --dir packages/taskflow run build` OK.
- Manual (rebuild + `pnpm yalc:push` into `is-test`, then `insight-flow ui`): in the "Test its working" flow, the `taskmaster → test-agent on test-ready` edge renders **neutral "not backed (built-in)"** (Taskmaster is built-in), NOT red orphan; and a custom-state edge whose target/trigger genuinely match a handover renders **backed**.

## Notes

- Follow-up to **N144** (orphan detection) and touches the N142 `edgeHandover` helper. Discovered testing the handover round in `is-test`.
- `resolveTrigger(on, states)` already exists in `flow-status.ts` (N112) — reuse it; do not reimplement alias logic.
- The built-in-source signal is `AgentDto.source` (already on the wire). "Built-in" = handovers locked = edge unbackable by the user, which is why it gets the softer treatment.
