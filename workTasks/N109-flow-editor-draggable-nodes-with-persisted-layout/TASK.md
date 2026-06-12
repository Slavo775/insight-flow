# N109 — Flow editor — draggable nodes with persisted layout

**Type:** feat
**Priority:** medium
**Created:** 2026-06-12

## Problem

- Flow maps are auto-laid-out and read-only. For the editor experience, users must arrange custom flows by hand: drag nodes and have positions persist in the flow definition.

## Goal

1. `ProjectSchema` gains an optional `layout` field: `{ [nodeId]: { x, y } }`; absent layout falls back to the existing auto-layout (shipped default keeps auto-layout unless a layout is saved on a *custom* flow).
2. On `/project/:id` for custom flows, an Edit mode toggle enables React Flow dragging; node positions track into local state and persist via N103 `PUT /api/projects/:id` on Save (explicit save, not save-per-drag).
3. View mode and all other map surfaces (agent pages, task map) honor a stored layout when present, auto-layout otherwise.
4. Dirty-state guard: leaving edit mode with unsaved moves prompts save/discard.

## Scope

### In scope

- `core/schema/index.ts` — `layout` on `ProjectSchema` (optional, validated coords).
- `packages/taskflow/src/dashboard/client/` — edit-mode toggle on the project page, draggable nodes, Save/Discard bar; FlowMap accepts `positions` + `onNodeDrag` props.
- Tests: schema accepts/round-trips layout; save→reload renders saved coordinates.

### Out of scope

- Edge creation/deletion (N110). Node add/remove (agents enter flows via N110's connect or duplicate-from-default for now). Editing the shipped default flow.

## Implementation plan

1. **Schema** — optional `layout` record; loader (N102) and N103 validation accept it.
2. **Editable map** — `nodesDraggable` in edit mode only; controlled positions from layout ?? auto-layout seed.
3. **Persist** — Save serializes positions into the flow JSON via PUT; Discard restores.
4. **Honor everywhere** — FlowMap position resolution shared by all read-only surfaces.
5. **Tests** — drag (simulated) → save → fetch shows layout; absent layout = auto.

## Verification

- Playground: drag two nodes on a custom flow, Save, hard-reload — positions identical; default flow has no edit toggle.
- Schema test: layout with non-numeric coords rejected.

## Notes

- Depends on N108 (custom flows to edit) + N103 (PUT). N110/N111 extend this edit mode; keep the edit-mode state container extensible.
