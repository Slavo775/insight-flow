# N110 — Flow editor — connectable ports (inputs left, outputs right)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-12

## Problem

- Editing a flow means rewiring it: connecting agent nodes with trigger-labeled edges. Nodes need a consistent port convention — inputs enter on the left, outputs leave on the right, the node body sits in the middle — and connections must only be creatable when they carry a legal trigger.

## Goal

1. Custom flow-editor node component: target handle (input) on the left edge, source handle (output) on the right edge, title/body centered — applied in edit mode (read-only maps may keep current styling).
2. In edit mode (N109), users can draw an edge from one node's output to another's input; on connect, a trigger picker (the `on` value) offers only legal values from the existing status/verdict enums; cancel aborts the edge.
3. Edges are selectable and deletable (keyboard delete + context affordance); edge labels render the trigger.
4. Validation: no self-loops, no duplicate (from,to,on) triples, every edge must have a trigger — enforced in the editor and re-checked by N103 on save.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/` — editor node component with left/right handles, `isValidConnection`, connect→trigger-picker dialog, edge delete; edit-mode state from N109 extended with edges.
- Shared client-side flow validation helpers mirroring schema rules.
- Tests: connection validation cases, trigger picker constrains values, duplicate-edge rejection.

### Out of scope

- Saving (N111 owns the persist round-trip — this task keeps changes in edit-mode state). Adding/removing agent *nodes* — if cheap, allow adding an existing composed agent as a node; otherwise explicitly defer and note it.
- Custom states as triggers (N112).

## Implementation plan

1. **Node ports** — handle placement left(target)/right(source); body centered; consistent sizing.
2. **Connect flow** — onConnect opens trigger picker (enum values, searchable); confirmed edge appended with label.
3. **Edit ops** — select/delete edges; validation guards (self-loop, dupes, missing trigger).
4. **State** — edges live alongside N109 positions in the edit-mode store, feeding N111's save.
5. **Tests** — validation helpers table-driven; component interaction smoke.

## Verification

- Playground (custom flow, edit mode): connect review-fix → human-review choosing trigger `fixed`; edge renders labeled; self-loop attempt blocked; duplicate triple blocked.
- Read-only view unchanged for the default flow.

## Notes

- Depends on N109. The trigger enum source must be the same one ProjectSchema validates against (single source of truth).
- Inputs-left/outputs-right is a hard requirement from the round brief.
