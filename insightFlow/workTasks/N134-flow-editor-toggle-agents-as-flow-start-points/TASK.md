# N134 — Flow editor: toggle agents as flow start points

**Type:** feat
**Priority:** medium
**Created:** 2026-06-16

## Problem

A flow's start/entry agents already exist as the `entryAgents` field: it's
schema-validated (`core/schema/index.ts:440`), round-trips through the server
(`dashboard/server/index.ts:780`), is rendered as "★ · main" in the project
sidebar (`ProjectPage.tsx:296-301`), and is functional — `insight-flow create`
routes a new task to the flow whose `entryAgents` includes the chosen agent
(`cli/commands/create.ts:37`). But there is **no UI to set it**: an author can
only declare a flow's start points by hand-editing JSON.

## Goal

1. From the flow editor, toggle any agent node as a flow **start point**
   (multiple allowed).
2. Persist the toggle into the existing `entryAgents` field via the normal Save.
3. Show start points on both the editable and read-only flow maps (★ badge).
4. Use consistent "start point" vocabulary in the flow UI (replace "main").
5. No schema / server / data-migration changes — reuse `entryAgents` as-is.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/FlowEditor.tsx` — add a
  "Set as start point / Unset start point" toggle to the node popover
  (`NodePopover`, ~line 446) beside "Remove from flow"; badge start-point nodes
  (★) in the editor; extend `FlowDraft` with `entryAgents` and report changes.
- `packages/taskflow/src/dashboard/client/ProjectPage.tsx` — seed `entryAgents`
  into the draft in `startEdit` (~line 169); persist `draft.entryAgents` in
  `saveDraft` (replacing the verbatim carry at ~line 220); relabel sidebar
  "★ · main" / "(no main …)" → "start point" (~lines 296-301).
- `packages/taskflow/src/dashboard/client/components/FlowMap.tsx` — add a ★
  start-point badge to entry-agent nodes (alongside 📍/▶, ~line 104).

### Out of scope

- `core/schema` (entryAgents already defined), `dashboard/server` (already
  round-trips), `cli/commands/create.ts` routing — no behavioral change.
- Renaming the `entryAgents` field itself (UI label only; field name stays).
- Single-vs-multiple constraints — multiple start points stay allowed.

## Implementation plan

1. **Extend the edit draft** — add `entryAgents: string[]` to the `FlowDraft`
   interface (`FlowEditor.tsx:88`); include it in the editor's `report()`
   (~line 299) so every draft carries it.
2. **Seed the draft** — in `ProjectPage.startEdit` (~line 169) set
   `entryAgents: project.entryAgents ?? []`.
3. **Toggle in the node popover** — in `NodePopover` (~line 446) add a Button
   labeled "Set as start point" / "Unset start point" based on whether
   `nodeMenu.id` is in the draft's entryAgents; on click add/remove the id, call
   `report()`, close the popover.
4. **Badge in the editor** — when building editor nodes (~line 265) prefix the
   label with ★ (or add a border/style accent) for ids in entryAgents.
5. **Persist on save** — in `ProjectPage.saveDraft` (~line 209) set
   `entryAgents: draft.entryAgents.filter((a) => draft.agents.includes(a))`
   (keep the N122 filter-to-existing-agents guard).
6. **Badge the read-only map** — in `FlowMap.tsx` (~line 104) add a ★ badge for
   `project.entryAgents?.includes(a)` nodes, composed with the 📍/▶ badges.
7. **Relabel sidebar** — in `ProjectPage.tsx` (~lines 296-301) change "★ · main"
   and the "(no main — pick by type only)" hint to "start point" wording.

## Verification

- `pnpm build` (tsc strict) passes.
- `pnpm play` → open a custom flow → **Edit flow** → click a node → "Set as
  start point" → ★ appears on the node → **Save** → reload → the agent shows
  "★ · start point" in the sidebar and ★ on the read-only map.
- Toggle a second agent → both persist (multiple allowed); unset one → it drops
  from `entryAgents` after Save.
- The flow JSON under `insightFlow/projects/` lists the toggled ids in
  `entryAgents`.

## Notes

- `entryAgents` introduced by N122–N123 (task routing). Internal field name
  unchanged; only the UI label becomes "start point".
- Default flow's `entryAgents = ["task-analyze","taskmaster"]`
  (`agents/project/default.json`) — matches the "agents that create/define the
  task" intuition the human described.
- Sibling of N135 (suppress map navigation in edit/create) — both from the same
  `/task-analyze` session on flow-chart UX.
