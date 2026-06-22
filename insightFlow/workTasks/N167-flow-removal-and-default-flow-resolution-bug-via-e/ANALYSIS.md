# N167 — Flow removal + default-flow override (feature) — Analysis

**Created:** 2026-06-22
**Author:** task-analyze
**Reframed:** 2026-06-22 — originally filed as a "bug" (flow removal not working). The human clarified: *"my fault it's not implemented yet, I tested an unimplemented thing."* So this is a **feature**, not a defect.

## Problem framing

- Not a bug. There is simply **no implemented way** to (a) remove a flow and have it stick, or (b) make a custom flow the active default for new tasks **without** giving it `entryAgents`.
- Today: a new task binds to the default taskmaster flow unless a custom flow declares start points (N122/N123 main-agent binding); deleting a flow isn't blocked by the guard (`custom-defs` has no `projects` ref case), but there's no UI path / the default re-asserts because nothing overrides it.

## Goal

1. Remove a custom flow from the dashboard (delete persists).
2. Set a custom flow as the binding default without `entryAgents` (surface `flows.defaultFlow`).
3. Unify resolution so the shipped default is just the no-override fallback.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Surface `flows.defaultFlow`/`byType` override in the dashboard + verify delete | Reuses the existing config lever (N116); minimal new model | UI work; must keep config + flows in sync | M |
| B — `entryAgents`-only (status quo) | No work | Requires start points; what the user found missing | — |
| C — New explicit "active flow" pointer in storage | Unambiguous | Duplicates `flows.defaultFlow`; more state | M |

## Decision

- Lean **A** (+ a thin slice of unify-resolution): the binding lever `config.flows.defaultFlow` already exists (`core/config.ts`); the gap is a UI to set it and confirming removal clears references. Avoid inventing a parallel "active flow" pointer.
- Design-led — confirm the binding path before coding.

## Open questions

- `[blocking]` Is `flows.defaultFlow` the right (and sufficient) lever, or is per-type `byType` needed for the user's case? Reproduce binding in `is-test`.
- `[blocking]` What does "remove a flow" do today end-to-end (delete project JSON + list refresh), and does anything still reference the removed id (`defaultFlow`/`byType`)?
- `[non-blocking]` Where exactly task-creation resolves the flow (N116/N123) — confirm it reads `flows.defaultFlow`.
- `[non-blocking]` Tracker metadata: this task's `type` (fix) and `status` (in-progress) can't be changed via CLI yet — see N170.

## Sources

- `core/config.ts` (`flows.defaultFlow`/`byType`), `ProjectPage.tsx`, `dashboard/server/custom-defs.ts` (delete guard), `agents/user-registry.ts` (`mergedProjectsView`) — provenance: analyzer-discovered, trust: high, fetched: 2026-06-22.
- Human clarification that the feature is unimplemented (not broken) — provenance: human-supplied, trust: high, fetched: 2026-06-22.

## Handoff brief

- Title: Flow removal + default-flow override · type: feat · priority: medium. Implement removing a custom flow (delete persists) and making a custom flow the binding default without `entryAgents` by surfacing the existing `flows.defaultFlow` lever in the dashboard, and unify resolution so the shipped default is the no-override fallback. Reproduce binding in is-test first. Related: N169, N116/N122/N123.
