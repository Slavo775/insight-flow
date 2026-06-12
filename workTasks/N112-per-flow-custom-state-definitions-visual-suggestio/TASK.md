# N112 — Per-flow custom state definitions (visual + suggestions)

**Type:** feat
**Priority:** low
**Created:** 2026-06-12

## Problem

- Custom flows are constrained to the canonical status enum. Teams want their own vocabulary — e.g. a 'qa-verify' state between review and merge. This task adds per-flow custom state definitions at the visual/suggestion layer while the real task state machine stays canonical (full prescriptive behavior is a future round).

## Goal

1. `ProjectSchema` gains optional `states: [{ id, title, color?, mapsTo }]` where `mapsTo` is a canonical status — every custom state aliases exactly one canonical status; ids namespaced (`state:` or flow-local uniqueness) and validated.
2. Flow edges may use custom state ids as `on` triggers when the flow defines them; validation resolves them through `mapsTo` so the underlying machine stays canonical.
3. Task map (N104) and suggestions (N105): when a task's flow defines custom states, the display layer shows the custom title/color for the mapped status and suggestions traverse edges via the alias.
4. Pickers, CLI, storage schema for tasks: provably untouched — tasks never store custom state ids.
5. Flow editor (N110/N111): trigger picker offers custom states (badged) alongside canonical values; states manageable in the flow's edit surface (simple list editor is sufficient).

## Scope

### In scope

- `core/schema/index.ts` — `states` on ProjectSchema + alias-aware trigger validation.
- Suggestion/mapping helpers (N104/N105) resolve aliases; `packages/taskflow/src/dashboard/client/` displays custom titles/colors; trigger picker extension; minimal states list editor in flow edit mode.
- Tests: schema (dup ids, unknown mapsTo rejected), alias resolution in suggestions, display substitution.

### Out of scope

- Custom states driving the actual task state machine, pickers, kanban columns, or stored task statuses (future round). Multi-status mapping (one custom state ↔ exactly one canonical status this round).

## Implementation plan

1. **Schema** — `states` array, refinements: unique ids, `mapsTo` ∈ canonical enum; trigger validation accepts canonical ∪ defined custom ids.
2. **Alias resolution** — single helper `resolveTrigger(flow, on) → canonicalStatus` used by suggestions, task map, and save validation.
3. **Display layer** — substitute title/color in map nodes/edges and suggestion chips when an alias covers the task's status.
4. **Editor** — states list editor (add/rename/recolor/delete with in-use guard) + badged trigger picker entries.
5. **Tests** — full alias pipeline: define state → use as trigger → suggestions and map honor it; canonical-only flows unaffected.

## Verification

- Playground: custom flow defines `qa-verify` (mapsTo `approved`); an approved task viewed through that flow shows 'qa-verify' styling and correct suggestions; default flow rendering byte-identical to pre-N112.
- Schema tests: duplicate state id and unknown mapsTo rejected; deleting an in-use state blocked.

## Notes

- Final task of the round; gated on N105 + N111. Priority low — ship the round without it if needed.
- ANALYSIS.md (N99 folder) records the phasing decision: visual+suggestions now, prescriptive later.
