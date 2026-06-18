# N150 — diagram reconciliation — edges self-define handover; retire orphan cross-check

**Type:** rework
**Priority:** medium
**Created:** 2026-06-18

## Problem

- N144/N146 built an "orphan vs backed vs built-in-source" classification that cross-checks each edge against the source agent's handover modules — necessary only because edges and handovers were decoupled. With edge-level handovers (N147/N148), an edge **carries** its own handover, so it's self-defined: there is no orphan. The diagram should render relation styling from the edge's OWN data, and the orphan cross-check should be retired where it's now superseded.

## Goal

1. `FlowMap`/`FlowEditor` render each relation from the edge itself: a **handover edge** (`edge.handover`) shows its auto/gated badge; a plain **status-change edge** (no `handover`) shows the trigger only — no "orphan".
2. `classifyEdge`'s orphan/built-in-source branches are removed or reduced to what's still meaningful; the cross-check against `handoversByAgent` is retired for edge rendering.
3. Legend updated to "status change · handover (auto) · handover (gated)".
4. `flow-status.test.mjs` updated; net simplification, no dead code left.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/FlowMap.tsx` and `FlowEditor.tsx` — drive edge label/stroke from `edge.handover` (auto = green, gated = accent, none = plain status-change). Remove the orphan-warning list + builtin-source neutral styling that the N146 cross-check produced. Keep/adjust the legend.
- `packages/taskflow/src/core/flow-status.ts` — retire/replace `classifyEdge` (and the `EdgeBacking` union) now that edges self-define; keep `resolveTrigger` (still used for trigger display/aliases) and remove `edgeHandover`/`isEdgeBackedByHandover` if no longer referenced (or repurpose minimally).
- `packages/taskflow/src/dashboard/client/ProjectPage.tsx` — drop the `handoversByAgent`/`builtinAgents` props passed for orphan detection if the new rendering no longer needs them.
- `packages/taskflow/src/index.ts` — update the barrel exports for any removed symbols.
- `packages/taskflow/test/flow-status.test.mjs` — replace the N144/N146 orphan/classify tests with edge-self-define rendering-logic tests (or pure-helper tests if a small classifier remains).

### Out of scope

- Edge schema (N147), editor picker (N148), install composition (N149).
- Do not remove N142's agent-module handover or the N146 alias logic where install-time composition (N149) still needs it.

## Implementation plan

1. **Edge rendering from self.** In FlowMap/FlowEditor edge mapping, compute style from `edge.handover?.mode` (auto/gated) vs none; keep the trigger label (resolve custom states for display). Drop the `classifyEdge(...handoversByAgent, builtins...)` call.
2. **Retire cross-check.** Remove the orphan-warning overlay/list (FlowEditor) and the builtin-source neutral path; simplify the legend to status-change vs handover(auto/gated).
3. **Core cleanup.** Remove `classifyEdge`/`EdgeBacking` (and `edgeHandover`/`isEdgeBackedByHandover` if unused after N149) from `flow-status.ts` + `index.ts`; ensure N149 doesn't depend on a removed symbol (coordinate — N149 may keep a small matcher).
4. **Props cleanup.** Stop threading `handoversByAgent`/`builtinAgents` into the map/editor if unused.
5. **Tests.** Update `flow-status.test.mjs` — drop orphan/classify cases, add edge-self-define expectations.
6. **Verify** (below).

## Verification

- `pnpm --dir packages/taskflow run typecheck` clean (no dangling refs to removed symbols); build OK.
- `pnpm --dir packages/taskflow test` passes with the revised tests.
- In play/is-test: a handover edge shows its auto/gated badge; a plain trigger edge shows just the trigger; no "orphan" styling remains. The original `taskmaster → test-agent` edge, once given `handover` via N148, renders as a handover (auto/gated), not orphan.

## Notes

- Rework that supersedes part of N144/N146 (acknowledged in ANALYSIS.md — the orphan cross-check existed only because edges/handovers were decoupled). Coordinate symbol removal with N149 (which may retain a minimal matcher for install composition).
- Depends on **N147** (edge data) and ideally lands after **N148** (so there are handover edges to render).
