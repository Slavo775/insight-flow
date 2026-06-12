# ANALYSIS — Round N99–N112: insightFlow layout + customization layer + prescriptive-lite flow

## Problem framing

The composer roadmap (N88–N98) delivered a registry of modules/agents (N89–N92), a read-only dashboard browser
with React Flow maps (N93), bundles (N95), and a descriptive project layer (N96). Nothing is user-customizable:
registries are compiled in, there is exactly one flow, maps are read-only, and storage is scattered
(`workTasks/` + `.events`). The human asked for: one `insightFlow/` root folder, user-authored
modules/agents/project-flows with the same data types as built-ins, authoring forms, a draggable/connectable
flow editor (inputs left, outputs right, body centered), multiple flows, custom states, and a task map that
highlights the current state and suggests next agents (multi-branch).

## Goal

Fourteen smallest-shippable tasks across six epics: layout migration (N99–N101), custom-definition storage +
CRUD (N102–N103), task map + suggestions (N104–N105), authoring forms (N106–N108), flow editor (N109–N111),
custom states (N112).

## Options considered

1. **Folder migration**: full migration with back-compat shim + `migrate-layout` command (CHOSEN) vs.
   new folder only for custom artifacts vs. defer entirely. Chosen because one root is the stated goal;
   shim + idempotent command contains the breaking-change risk in its own epic.
2. **Custom states depth**: phased — flows over the existing enum now, alias-based custom states last (CHOSEN)
   vs. fully dynamic status registry now (rejected: status enum is baked into Zod schemas, pickers, kanban,
   N96 trigger validation — highest-risk path) vs. visual-only labels (rejected: too shallow).
3. **Sequencing**: task map + suggestions first after migration (CHOSEN — cheapest high-value win, read-only
   on N96 data) vs. storage+forms first vs. editor first.
4. **Prescriptiveness**: flows power suggestions only; pickers/state machine stay canonical (CHOSEN — honors
   N96's descriptive-now contract) vs. fully prescriptive (deferred to a future round).

## Decision

Proceed with the 14-task round in dependency order N99 → N100 → N101 → {N102 → N103} → {N104 → N105} →
{N106, N107, N108} → N109 → N110 → N111 → N112. Editing is restricted to user-space (`custom:`) artifacts;
built-ins stay immutable; the shipped default flow stays canonical and undeletable.

## Open questions

- Whether adding/removing agent *nodes* in the editor lands in N110 or is deferred (implementer decides, must note).
- Layout overrides for the shipped default flow (N109 keeps default auto-layout; revisit if users ask).
- Bundle (N95) editing in forms — excluded this round.
- Legacy `workTasks/` fallback removal timeline (kept ≥ one release; deprecation note in N101).

## Sources

- workTasks/N88–N98 TASK.md specs (composer roadmap), esp. N93 (browser/maps) and N96 (project layer,
  descriptive-now/prescriptive-later contract).
- packages/taskflow/src: core/paths.ts, core/schema, agents/compose.ts, agents/project/, dashboard/server+client.
- /task-analyze session 2026-06-12 with the human; all four fork decisions taken on the recommended option.

## Handoff brief

Created N99–N112 via taskmaster on 2026-06-12. Statuses: all `ready`. Priorities: high for the migration epic
(N99–N101) and the task-map epic (N104–N105), medium for storage/forms/editor, low for N112. Prerequisites noted:
N98 sat in `fixed` and N83 in `approved` at round-creation time — close them out before starting N99.
