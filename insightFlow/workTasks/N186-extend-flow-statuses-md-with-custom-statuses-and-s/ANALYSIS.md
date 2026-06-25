# N186 — Analysis (pre-taskmaster strategist)

## Problem framing

Request: "document also statuses, custom statuses, and relationships, handovers."
On investigation, **most of this was already built and approved** in the N181–N185
batch (not yet shipped, so the requester hadn't browsed it). The strategist's job
here was to prevent duplicate work and isolate the genuine residual gap.

## Where each requested topic already lives

- **Statuses (canonical):** `flow/statuses.md` (existing) + `built-ins/default-flow.md`.
- **Custom statuses & state aliases:** `concepts/flows.md` + `guides/custom-flow.md`
  (covered, but scattered).
- **Relationships (flow edges):** `concepts/flows.md` + `built-ins/default-flow.md`
  (the 13 edges). **Fully covered.**
- **Handovers:** `concepts/handover.md` (N182) — module-level vs flow-edge, auto vs
  gated, the lifecycle chain. **Fully covered.**

→ Handovers and relationships are done; re-documenting them would duplicate
freshly-approved work.

## The real gap

`flow/statuses.md` (from N178) documents ONLY the canonical/default-flow statuses
and presents them as the whole story — no mention of custom statuses or state
aliases, no link to the newer material. It is incomplete/stale for the
composition-v2 world.

## Options considered

- **Big "statuses + handovers" task** — rejected: largely duplicates N182/N184.
- **Consolidated standalone Statuses reference** — viable but overlaps
  `concepts/flows.md`; deferred.
- **Minimal: extend `flow/statuses.md` + cross-link** — CHOSEN. Closes the
  stale-page gap without duplication; the batch already carries the depth.

## Decision (human-confirmed)

Extend `flow/statuses.md`: reframe as the default flow's statuses, add a "Custom
statuses & state aliases" section (the two mechanisms), cross-link
`concepts/flows.md` + `guides/custom-flow.md`. New small task, implemented AFTER
the N181–N185 batch ships (same docs tree, cross-links the batch's pages).

## Key facts established (from source)

- `statuses[]` — N128, `FlowStatusSchema` (`schema/index.ts:511`): id/name/color/
  `terminal`; **empty set ⇒ falls back to the canonical universe**. The value a
  task actually stores.
- `states[]` — N112, `ProjectStateSchema` (`schema/index.ts:532`): display aliases
  that `mapsTo` exactly one canonical status. `resolveTrigger`
  (`flow-status.ts`) collapses an alias to its canonical status. Visual/suggestion
  layer; does not change the stored status.
- Canonical statuses: `src/core/statuses.ts`.
- The two mechanisms are DISTINCT — the doc must not conflate them.

## Open questions

- Whether to add reciprocal back-links from `concepts/flows.md` / `guides/custom-flow.md`
  to this page — left to the implementer (only if it aids discoverability).

## Sources

- `src/core/schema/index.ts` (`FlowStatusSchema` N128, `ProjectStateSchema` N112),
  `src/core/flow-status.ts` (`resolveTrigger`), `src/core/statuses.ts`.
- Existing docs: `website/docs/flow/statuses.md`, `concepts/flows.md`,
  `guides/custom-flow.md`, `built-ins/default-flow.md`, `concepts/handover.md`.

## Handoff brief

feat / low / tags docs,flow. Extend `flow/statuses.md`: frame the table as the
default flow's statuses; add "Custom statuses & state aliases" (statuses[] N128
universe + states[] N112 aliases, distinct); cross-link concepts/flows.md +
guides/custom-flow.md. Docs-only. Implement after N181–N185 ships. Handovers/
relationships explicitly out (already covered).
