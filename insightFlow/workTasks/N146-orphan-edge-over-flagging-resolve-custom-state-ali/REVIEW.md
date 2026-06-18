# N146 — orphan-edge over-flagging — resolve custom-state aliases + soften built-in-source edges — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Fixes N144's orphan over-flagging two ways: (1) `edgeHandover`/`isEdgeBackedByHandover` now resolve the edge trigger through the flow's `states` via the existing `resolveTrigger` before matching, so custom-state-aliased edges stop falsely orphaning; (2) a new pure `classifyEdge` returns `backed | builtin-source | orphan`, and `FlowMap`/`FlowEditor` render the built-in-source case neutrally instead of red, reserving red `⚠ orphan` (and the editor warning list) for genuinely-fixable custom-source edges. Pure/descriptive — no semantic, schema, or status changes. Risk: low.

## Checklist verification

- [x] `edgeHandover`/`isEdgeBackedByHandover` accept optional `states`, resolve via `resolveTrigger` before matching — pass (`flow-status.ts`)
- [x] Custom-state edges no longer falsely orphaned — pass (unit test + verified on real is-test data → `builtin-source`)
- [x] Built-in classifier threaded `ProjectPage → FlowMap/FlowEditor` (`AgentDto.source !== "custom"`) — pass
- [x] Three-way render: backed (mode badge) · not-backed-built-in (neutral) · orphan (red ⚠); legend updated on both surfaces — pass
- [x] Back-compat: helper without `states` behaves as before — pass (explicit test)
- [x] No regression on the default project (still zero orphans — canonical handovers match, `backed` wins) — pass
- [x] Gates: 246/246 tests (2 new), package + client `tsc --noEmit` clean, build OK — pass

## Blockers

None.

## Non-blocking

1. **`FlowEditor` resolves aliases against saved `project.states`, not the draft.** `flowStates = project.states` — if a user adds a custom state *and* wires an edge to it in the same unsaved session, classification won't resolve that alias until Save. Combined with the inherited N144 behavior that `initialEdges` seeds once per `project.id`, edge styling can lag mid-edit. Minor; acceptable. If tightened later, derive `flowStates` from the live draft states.
2. **`builtins` default-Set identity** (`FlowMap`/`FlowEditor`: `builtinAgents ?? new Set()`): when the prop is omitted a fresh Set is created each render, which would re-run FlowMap's `useMemo`. ProjectPage always passes the memoized set, so it's latent — but a `useMemo(() => builtinAgents ?? new Set(), [builtinAgents])` would make it airtight.
3. No component-level UI test (consistent with the codebase). The pure logic (`edgeHandover` alias + `classifyEdge` three-way) is well-covered.

## Security & edge cases

- `classifyEdge` precedence is correct: a built-in source *with* a matching handover is `backed`, not `builtin-source` (verified — `taskmaster → task-implement on ready` = backed).
- Graceful with empty inputs (`handoversByAgent = {}`, no states) — everything falls through to orphan/builtin without throwing.
- `project.states` → `FlowStateDef[]` is structurally compatible (the cast is safe; tsc clean).

## Notes

Follow-up to N144; touches the N142 `edgeHandover` helper. Verified against the real `is-test` "Test its working" flow: the `taskmaster → custom:test-agent on test-ready` edge from the original bug report now classifies `builtin-source` (neutral), not red orphan.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Project owner approved the full handover round (N142–N146) and authorized creating the PR + merging via gh, then rebuilding into the is-test project.

### Blockers

None.

### Suggestions (non-blocking)

None raised.

### Notes

Human's exact words: "approved all please create prs and merge it via gh also please build it and pass it into is-test project"
