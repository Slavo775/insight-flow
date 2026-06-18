# ANALYSIS — N146 orphan-edge over-flagging

_Pre-taskmaster strategy record. Follow-up to the N142–N145 handover round; discovered testing in `is-test`._

## Problem framing

While testing the handover round in the `is-test` project's custom flow "Test its working", the N144 orphan-edge indicator rendered the edge `taskmaster → custom:test-agent on test-ready` as red `⚠ orphan`. The user read this as an error. Two separate causes:

1. **Bug (accuracy):** `edgeHandover` (`core/flow-status.ts`) compares the edge's raw trigger to the handover's trigger. The edge fires on custom state `test-ready` (`mapsTo: ready`); Taskmaster's handover is on `ready`. `"test-ready" !== "ready"` ⇒ falsely orphan even when target+trigger semantically match. The N112 `resolveTrigger(on, states)` helper exists for exactly this aliasing but N144 didn't use it.
2. **UX (expectation):** the edge's source (Taskmaster) is a built-in agent whose handovers are LOCKED. So it can *never* be backed — yet it renders as a red, user-fixable "error". For this specific edge the orphan is technically correct (target differs), but the class of "built-in source → always orphan" makes custom-flow authoring feel broken.

## Goal

Make orphan-detection accurate (resolve aliases) and make the unbackable-by-design case (built-in source) read as informational rather than an error, without changing the descriptive (agent-wins) model.

## Options considered

For the built-in-source case (the only real fork; the alias fix is unambiguous):

- **A. Fix alias bug only.** Smallest/surgical; built-in-source edges still red orphan — "feels broken" UX remains. Rejected as insufficient.
- **B. Fix alias bug + soften built-in-source edges** to a neutral "not backed (built-in)" style/label, reserving red `⚠ orphan` for genuinely-fixable custom-source edges. **Chosen.** Honest, no longer looks like a user error, keeps the signal.
- **C. Fix alias bug + suppress orphan entirely for built-in sources.** Cleaner but loses the "this edge isn't real" signal — drops information. Rejected.

## Decision

Option **B**. (1) Thread the flow's `states` into `edgeHandover`/`isEdgeBackedByHandover` and resolve `edge.on` via `resolveTrigger` before matching. (2) Add a built-in-source classifier (`AgentDto.source !== "custom"`) from `ProjectPage` into `FlowMap`/`FlowEditor`; render three states — backed (mode badge) · not-backed-built-in (neutral) · orphan (red ⚠, custom source) — and update the legend. Descriptive only; no semantic/schema/status changes.

## Open questions

- Exact neutral styling/label wording for "not backed (built-in)" — leave to implementer's judgment within the existing legend style.
- Whether to also resolve aliases on the *handover* side: not needed — handover `on` is authored canonical; only the edge side can carry a custom-state id.

## Sources

- `packages/taskflow/src/core/flow-status.ts` — `edgeHandover`, `isEdgeBackedByHandover`, `resolveTrigger` (N112), `FlowStateDef`.
- `packages/taskflow/src/dashboard/client/components/FlowMap.tsx`, `FlowEditor.tsx` — N144 edge rendering + legend.
- `packages/taskflow/src/dashboard/client/ProjectPage.tsx` — builds `handoversByAgent`; has `registry.agents` (with `source`).
- Repro data: `is-test/insightFlow/projects/test-its-working.json` (edge on `test-ready`, state `mapsTo: ready`), `is-test/insightFlow/agents/test-agent.json`.

## Handoff brief

fix · medium · tags handover,flow-editor,dashboard,bug. Resolve custom-state aliases in `edgeHandover` (reuse `resolveTrigger`); classify edges three ways and soften built-in-source edges from red orphan to neutral "not backed (built-in)". Update `flow-status.test.mjs`. No behavior/semantic change. Follow-up to N144.
