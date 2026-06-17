# N135 — Review

**Verdict:** APPROVED
**Reviewer:** AI (task-review)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/100

## Summary

N135 adds a `readOnly` (suppress-navigation) prop to the shared `CompositionMap`
and `FlowMap`, and wires the `AgentForm` live preview to open the in-place
`ModuleInfoModal` instead of navigating away. This fixes the confirmed data-loss
bug (clicking a preview node discarded the unsaved agent form) and removes the
reachable dead `/agent/__preview` route. Read-only detail maps are untouched.
Diff is confined to 2 client files. Gates green (typecheck/lint/build/219 tests).

## Checklist verification

- [x] `CompositionMap` accepts `readOnly` and honors it — guards both `navigate()`
      branches (module fallback + agent), while `onModuleClick` still fires.
- [x] `AgentForm` preview no longer navigates; opens `ModuleInfoModal`; form preserved
      — `readOnly` + `onModuleClick={setOpenModuleId}` + modal render.
- [x] Dead `/agent/__preview` unreachable — the `agent:__preview` node is role `agent`,
      whose navigation is suppressed under `readOnly`.
- [x] `FlowMap` exposes `readOnly` (defaults to navigating).
- [x] Read-only `AgentDetail` / `ModuleDetail` maps unchanged — neither passes `readOnly`.

## Non-blocking

1. **`FlowMap.readOnly` is currently unused** (forward-looking, as the spec called for —
   flow edit already swaps to the non-navigating `FlowEditor`). Acceptable; it's a thin,
   well-documented prop, not dead logic.
2. **Dangling preview module id** → `openModule` resolves to `null` and the click is a
   no-op (no crash). Fine for the preview path.

## Security & edge cases

- Purely client-side navigation gating; no new inputs. The modal reuses
  `ModuleDetail`'s `KindPanels`/`ModuleHeader`, identical to the existing read-only
  path. No security concerns.

## Notes

- Interactive verification (create/edit an agent → click a preview node → confirm a
  modal opens and the form is preserved) is recommended in human review; logic verified
  against the diff + gates.
