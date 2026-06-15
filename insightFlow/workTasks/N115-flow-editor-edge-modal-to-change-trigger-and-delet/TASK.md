# N115 — Flow editor — edge modal to change trigger and delete relationship

**Type:** feat
**Priority:** medium
**Created:** 2026-06-15

## Problem

- Once an edge is drawn, its trigger can never be changed and deleting it is effectively hidden. `FlowEditor` sets the trigger only at `onConnect` (the picker overlay), and edge deletion is keyboard-only (`deleteKeyCode={['Backspace','Delete']}` after selecting) — undiscoverable, so authors report they 'cannot delete a relationship'.

## Goal

1. Clicking an edge in edit mode opens a modal that can **change the edge's trigger** — a picker over canonical statuses (`TASK_STATUSES`) ∪ this flow's custom states (N112) — or **delete the edge**.
2. Changing a trigger re-validates against duplicate `(from, to, on)` triples using the existing `core/flow-edit.ts` rules; an illegal change is blocked with a message (no silent no-op).
3. Deleting from the modal removes the edge from the draft; the existing Backspace/Delete keyboard shortcut is retained as a power-user path.
4. Edits flow through the existing draft + N111 Save (PUT) round-trip unchanged.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/components/FlowEditor.tsx` — add `onEdgeClick` opening the edge modal; reuse the connect-time trigger picker (canonical ∪ custom states) for the change-trigger control.
- An edge modal component (change trigger / delete / cancel) — may reuse the N110 picker overlay styling.
- Duplicate-triple validation via `validateEdgeAddition`/`edgeKey` from `core/flow-edit.ts` (treat a trigger change as remove-old + add-new for the duplicate check).

### Out of scope

- Node add/remove (N114). New-flow agent picking (N113).
- Changing edge endpoints (from/to) — out of scope; delete + redraw instead.
- Schema changes (the duplicate-triple + trigger-legality superRefine from N110/N112 already backstops save).

## Implementation plan

1. **Edge modal** — `onEdgeClick` (edit mode) opens a modal showing `from → to` and the current trigger; a picker (canonical statuses + this flow's custom states, badged like N112) and Delete / Save / Cancel.
2. **Change trigger** — on Save, validate the prospective edge against the other edges (duplicate triple, self-loop already impossible); reject with an inline message or apply + mark dirty.
3. **Delete** — remove the edge from the draft; keep the keyboard shortcut working.
4. **Tests** — duplicate-triple rejection on trigger change (unit, reusing flow-edit helpers); component smoke for change + delete.

## Verification

- `pnpm build` + suite green.
- Playground: click an edge → change its trigger to another status (and to a custom state) → Save → reload shows the new trigger; a change that would duplicate an existing triple is blocked; Delete from the modal removes the edge.
- Backspace/Delete on a selected edge still deletes (unchanged).

## Notes

- Decisions from /task-analyze: edge interaction is click→modal; keyboard delete retained. Builds on N110 (connect picker + edge rules) + N112 (custom states).
- Trigger change = remove-old + add-new for the duplicate-triple check, so the same `(from,to,on)` guard applies.
