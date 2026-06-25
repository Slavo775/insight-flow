# N186 — Extend flow/statuses.md with custom statuses and state aliases

**Type:** feat
**Priority:** low
**Created:** 2026-06-25

## Problem

- `website/docs/flow/statuses.md` (from N178) documents **only** the canonical/default-flow statuses (11 lifecycle + 4 change-request) and presents them as if they are the only statuses. It has **no mention** of custom statuses or state aliases — the composition-v2 feature that lets a flow define its own status universe — and **no cross-link** to the newer material that does cover them (`concepts/flows.md`, `guides/custom-flow.md`). A reader landing there gets an incomplete, slightly stale picture.

## Goal

1. Reframe `flow/statuses.md` so the listed statuses are clearly the **default flow's** set, not "the only" statuses.
2. Add a "Custom statuses & state aliases" section explaining the two distinct mechanisms.
3. Cross-link the existing deeper coverage (`concepts/flows.md`, `guides/custom-flow.md`).

## Scope

### In scope

- **`website/docs/flow/statuses.md`:**
  - Add a sentence/intro clarifying these are the **default flow's** statuses (defined in `src/core/statuses.ts`); flows can define their own.
  - New section **"Custom statuses & state aliases"** distinguishing the two mechanisms (ground in source):
    - **Custom status universe** — a flow's `statuses[]` (N128, `FlowStatusSchema`): each entry has an `id` (the value a task actually stores), `name`, optional `color`, optional `terminal` flag. An **empty `statuses` set falls back to the canonical universe** (back-compat). These are the real values a task can hold in that flow.
    - **State aliases** — a flow's `states[]` (N112, `ProjectStateSchema`): display aliases that **map onto exactly one canonical status** (`mapsTo`). They're a visual/suggestion layer (badges/kanban labels) and do **not** change the stored status. `resolveTrigger` collapses an alias to its canonical status.
  - Cross-link `../concepts/flows.md` (the model) and `../guides/custom-flow.md` (the how-to: declaring a custom flow's statuses).
- **Optional, light:** add a back-link to this page from `concepts/flows.md` and/or `guides/custom-flow.md` if it improves discoverability (only if it doesn't duplicate content).

### Out of scope

- **Handovers and relationships** — already fully documented in `concepts/handover.md` and `concepts/flows.md`. Do NOT duplicate.
- A new standalone "Statuses" reference page (the decision was to extend the existing page, not consolidate).
- Any change to `src/core/statuses.ts` or the flow schema — docs only.
- Re-documenting the canonical status table (keep it; just contextualize it).

## Implementation plan

1. **Confirm the schema** from source: `src/core/schema/index.ts` — `FlowStatusSchema` (N128: id/name/color/terminal; empty ⇒ canonical fallback) and `ProjectStateSchema` / `states` (N112: `mapsTo`); `src/core/flow-status.ts` `resolveTrigger` (alias → canonical). `src/core/statuses.ts` for the canonical set.
2. **Edit `flow/statuses.md`** — add the "default flow" framing line near the top.
3. **Add the "Custom statuses & state aliases" section** with the two-mechanism explanation + a small example (a custom flow declaring `statuses` and a `states` alias).
4. **Cross-link** `concepts/flows.md` and `guides/custom-flow.md`; add reciprocal back-links if helpful.
5. **Build** — `pnpm --dir website build` clean (no broken links/anchors).

## Verification

- `pnpm --dir website build` passes with zero broken-link/anchor warnings.
- `flow/statuses.md` clearly distinguishes canonical (default flow) statuses from custom `statuses[]` and `states[]` aliases; both ground to source (N128 / N112).
- Cross-links to `concepts/flows.md` + `guides/custom-flow.md` resolve.
- `npx prettier --check` (or the repo's prettier) passes on the edited file.

## Notes

- Follow-on to the documentation program (N181–N185). **Implement AFTER the N181–N185 batch ships** — this edits the same `website/docs/` tree and cross-links the batch's pages, so doing it before the batch merges would tangle the diffs.
- Confirmed mechanisms are distinct: `statuses[]` (N128) = the stored status universe; `states[]` (N112) = display aliases (`mapsTo` a canonical status). The doc must not conflate them.
- See `ANALYSIS.md` for why handovers/relationships are excluded (already covered, no duplication).
