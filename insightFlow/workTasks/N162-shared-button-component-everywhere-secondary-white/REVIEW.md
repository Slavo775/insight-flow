# N162 — Review

**Verdict:** approved
**Reviewer:** task-review (ai)
**Date:** 2026-06-22
**PR:** https://github.com/Slavo775/insight-flow/pull/111
**Round:** 1

## Summary

Adds a neutral white-bordered `secondary` variant to the shared `Button`, plus `text-decoration: none` on the base so a `Button` rendered `as={Link}` reads as a button. Routes the previously-bare link-actions through the component: Edit (ModuleDetail/AgentDetail) → `primary`; ← All modules + Cancel → `secondary`; Revert-to-shipped/Delete → `secondary`. UI-only, matches the request.

## Checklist verification

CHECKLIST.md is template placeholders; verified against TASK.md Goal:

- ✅ **`secondary` variant** — transparent bg, `theme.color.border`, accent border on hover, disabled state. Added to the union + `buttonVariants` map; exhaustive map keeps the typed lookup total.
- ✅ **Link-actions through `Button`** — Edit, ← All modules, Cancel all use `Button as={Link}`; polymorphic `as` type-checks under styled-components v6 (DTS build passes).
- ✅ **Variant assignments** — Edit `primary`; Cancel + Revert/Delete `secondary`; Save changes stays `primary`.
- ✅ **Quality gates** — `tsc --noEmit` passes; 269 tests green (no component test harness exists; UI verified via build + the diff).

## Non-blocking

1. **Destructive affordance softened.** The same button renders "Revert to shipped" *and* "Delete" (custom modules); moving it from `danger` (red) to `secondary` removes the red cue from the genuinely destructive **Delete** path. This is per the explicit request (white-bordered), so accepted — but consider keeping `danger` specifically when the label is "Delete" (`!editingDefault`) and `secondary` for "Revert to shipped", since they carry different risk.
2. **AgentDetail Edit relocation.** Edit was lifted out of the inline `·`-separated `<Sub>` meta line into the `<Header>` to match ModuleDetail's standalone button. Slightly beyond "route through Button," but a sensible consistency improvement; no functional impact.

## Security & edge cases

- No new data flow; `to` targets are existing internal routes. `as={Link}` renders an anchor with the variant styles — no DOM/security concern.
- `text-decoration: none` on the base affects all variants; harmless (buttons weren't underlined).

## Notes

- No automated coverage is possible without a component test harness; acceptable for a styling-only change. Manual check: `/module/notify`, `/module/edit/notify`, an agent page.
