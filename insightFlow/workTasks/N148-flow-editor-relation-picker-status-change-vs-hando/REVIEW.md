# N148 — flow-editor relation picker — status change vs handover (auto/gated) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**PR:** (no PR yet)
**Verdict:** approved

## Summary

FlowEditor's connect-overlay and edge-modal gain a "Handover to this agent" toggle + auto/gated select, independent of the trigger picker. The choice persists onto `edge.handover` through `toReactFlowEdge`/`toFlowEdge` (carried in React-Flow edge `data`) and out via `FlowDraft.flow`. Risk: low.

## Checklist verification

- [x] Connect overlay + edge modal offer trigger (optional) + handover toggle + auto/gated — pass
- [x] `edge.handover` round-trips: `toReactFlowEdge` stores it in `data`, `toFlowEdge` reads it, `onEdgeClick` seeds the modal from `data.handover` — pass
- [x] Persists via FlowDraft → Save — **verified end-to-end**: `ProjectPage.saveDraft` PUTs `flow: draft.flow` verbatim (`ProjectPage.tsx:218`), so handover is not dropped on save
- [x] Works for built-in source agents (writes the edge; no agent file) — pass
- [x] Trigger and handover independent in the UI — pass

## Non-blocking

1. Agent-editor parity: the spec mentioned mirroring the toggle where the agent editor wires relations — N148 is flow-editor-only. Acceptable (the agent editor doesn't wire agent-to-agent relations today); note as a follow-up if that surface is added.

## Security & edge cases

- `validateEdgeAddition` dedup key is (from,to,on) — handover isn't part of identity, so you can't create two edges differing only by handover. Correct.
- Unchanged edges keep their handover across node-drag `report()` (via `toFlowEdge` reading `data.handover`). Verified by tracing the report path.

## Notes

Depends on N147. The save-path check was the key risk and it's clean (`flow: draft.flow` verbatim).


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
