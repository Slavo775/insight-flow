# N154 — ModuleDetail/AgentDetail render handover + status-transition kinds

**Type:** fix
**Priority:** low
**Created:** 2026-06-18

## Problem

- The `handover` (N142) and `status-transition` (N128) module kinds are creatable/editable (N143) but not fully surfaced in the browse UI (N143 REVIEW.md): `ModuleDetail`'s `KindPanels` has no case for them (detail page shows no fields), `facetLabel` falls back to the raw kind, and the `AgentDetail` legend omits them (and `bundle`).

## Goal

1. A `handover`/`status-transition` module's detail page shows its kind-specific fields.
2. The compact facet label is informative for both kinds.
3. The `AgentDetail` composition legend lists `handover`, `status-transition` (and `bundle`).

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/ModuleDetail.tsx` — `KindPanels`: add `status-transition` (show `agent`, `sets`, optional `from`) and `handover` (show `to`, optional `on`, `mode`, optional `label`) panels, mirroring the `hook`/`mcp-server` KV style. `facetLabel`: add `handover → "→ {to} ({mode})"`, `status-transition → "sets {sets}"`.
- `packages/taskflow/src/dashboard/client/AgentDetail.tsx` — extend the legend `KINDS` (line ~51) to include `handover`, `status-transition`, and `bundle`.
- (`ModuleDto` already carries `agent/sets/from/to/on/mode/label` from N143 — no api.ts change expected.)

### Out of scope

- No editor (ModuleForm/AgentForm) changes — those already handle the kinds (N143).
- No `kindColor` change — already added in N143.
- No new data/schema.

## Implementation plan

1. **KindPanels cases.** Add the two `case` branches in `ModuleDetail.KindPanels` rendering the fields via the existing `Panel`/`KV`/`Pre` components.
2. **facetLabel cases.** Add the two `case` branches returning the compact strings.
3. **AgentDetail legend.** Add the missing kinds to the `KINDS` array so `usedKinds` can surface them (colors come from the existing `kindColor`).
4. **Verify** (below).

## Verification

- `pnpm --dir packages/taskflow run typecheck` + `lint` + `format:check` clean; build OK.
- In `pnpm play`: open a custom `handover` and a `status-transition` module's detail page → fields render; the agent detail legend shows the new kinds for an agent that carries them.

## Notes

- Source: N143 REVIEW.md non-blocking items #1–3. Visible polish for the shipped handover feature. Independent of N153/N155/N156.
