# N150 — diagram reconciliation — edges self-define handover; retire orphan cross-check — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**PR:** (no PR yet)
**Verdict:** approved

## Summary

FlowMap/FlowEditor now render relation styling from the edge's own `handover` (auto → green, gated → accent, none → plain status-change). The N144/N146 cross-check (`classifyEdge`/`edgeHandover`/`isEdgeBackedByHandover`/`EdgeBacking`), the orphan-warning overlay, the builtin-source neutral path, and the `handoversByAgent`/`builtinAgents` plumbing are all removed; legend simplified. Net simplification. Risk: low.

## Checklist verification

- [x] Edges render from `edge.handover`; no orphan concept — pass
- [x] `classifyEdge`/`EdgeBacking`/`edgeHandover`/`isEdgeBackedByHandover` removed from `flow-status.ts` + `index.ts`; `AgentHandover` kept (reused by N149) — pass
- [x] Orphan-warning + builtin-source styling removed; legend = status-change / handover(auto) / handover(gated) — pass
- [x] `handoversByAgent`/`builtinAgents` props dropped from map/editor + ProjectPage memos removed — pass
- [x] No dangling refs (typecheck clean); `flow-status.test.mjs` cross-check tests removed — pass

## Non-blocking

None.

## Security & edge cases

- `AgentHandover` retained intentionally (N149 install composition uses it) — not dead code.
- Custom-state triggers still display via `project.states` title in FlowMap; FlowEditor shows the raw trigger (pre-existing behavior).

## Notes

Supersedes the N144/N146 orphan machinery as planned (ANALYSIS.md). Coordinated with N149 (which kept `resolveTrigger` + `AgentHandover`). 248 tests pass after removing the now-moot cross-check tests.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Project owner approved the edge-authored-handovers round (N147–N150) and authorized merging via gh.

### Blockers

None.

### Suggestions (non-blocking)

None raised.

### Notes

Human's exact words: "done please merge it via gh"
