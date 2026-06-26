# N189 — Structured handover intent — when/reason per handover candidate — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-26
**PR:** (no PR yet — working tree on `feat/composer-mcp`)
**Verdict:** approved

## Summary

Optional `when` on handovers (edge + module), threaded end-to-end and rendered
into the `## Handover` section for auditable 1-of-N branch picks, plus a `when`
field in the flow editor. Clean, backward-compatible, well-scoped.

## Checklist verification

- [x] `when` added to edge `handover` + handover module (`core/schema/index.ts`) — pass
- [x] `AgentHandover.when` carried through `flowHandoversByAgent` — pass
- [x] `handoverSection` renders the reason (single + multi forms) — pass (tested)
- [x] Flow editor shows/edits `when` and round-trips — pass
- [x] Backward compatible: handovers without `when` render unchanged — pass (drift guard green)

## Blockers

None.

## Non-blocking

None.

## Security & edge cases

- `when` is descriptive (rendered into prose); no execution semantics — no new surface.
- Threading verified with no drop: schema → `AgentHandover` → `flowHandoversByAgent`
  → `mergeHandovers` → `handoverSection`.

## Notes

Independent of the subagent line; not affected by the N190 blockers.
