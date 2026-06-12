# N111 — Flow editor — save/load round-trip via CRUD API

**Type:** feat
**Priority:** medium
**Created:** 2026-06-12

## Problem

- N109/N110 hold layout and edge edits in client state. The editor is only real once Save round-trips through the CRUD API with validation, and a reload renders exactly what was saved.

## Goal

1. Save in flow-edit mode serializes the full edited flow (agents, flow edges, layout, install untouched) and `PUT /api/projects/:id`; success exits edit mode and re-renders from the server copy.
2. Round-trip fidelity: load → edit → save → reload yields a deep-equal flow definition (order-stable serialization; no lossy fields).
3. Server validation failures (schema, referential, duplicate edges) render as an inline error panel mapping issues to nodes/edges where possible; client state is preserved for fixing.
4. Concurrent-edit safety floor: PUT carries the loaded revision (mtime or hash); stale writes get 409 with a reload prompt.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/` — save pipeline from the N109/N110 edit store; error panel; revision header handling.
- `packages/taskflow/src/dashboard/server/index.ts` — extend N103 PUT with revision precondition (If-Match-style) for projects.
- Tests: round-trip deep-equality (HTTP-level), validation-error surface, stale-revision 409.

### Out of scope

- New edit capabilities. Editing default/shipped flow. Autosave/undo history (explicit save only this round).

## Implementation plan

1. **Serialize** — edit store → ProjectSchema JSON; stable key order via existing storage conventions.
2. **Save + refresh** — PUT, then GET and rebuild view state from server truth (no client-trust).
3. **Errors** — map Zod paths to edge/node identifiers; non-mappable issues listed plainly; keep edit state.
4. **Revision guard** — hash of stored file as revision token; server compares before write.
5. **Tests** — scripted edit (move node, add edge) → save → fetch deep-equal; tampered revision → 409.

## Verification

- Playground: edit a custom flow (drag + new edge), Save, hard-reload — identical map; corrupt edit (forced bad trigger via devtools/state) → 400 panel, edits preserved.
- Two tabs: save in one, save in the other → 409 + reload prompt.

## Notes

- Depends on N103, N109, N110. Completes the editor epic; N112 is the only remaining round task.
