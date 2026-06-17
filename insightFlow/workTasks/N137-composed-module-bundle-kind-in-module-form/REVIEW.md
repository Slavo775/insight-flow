# N137 — Review

**Verdict:** approved
**Reviewer:** task-review (AI)
**Date:** 2026-06-17
**PR:** none yet (working-tree review on `feat/N137-N138-composer-ux`)

## Summary

`ModuleForm.tsx` now exposes the pre-existing `bundle` kind as a creatable kind labeled **"Composed module (bundle)"**, with a searchable, reorderable module multi-select mirroring `AgentForm`'s picker. Self-reference is excluded and an empty selection is rejected. No schema/composer change — the bundle data model and recursive `resolveModules` expansion (N95) were already in place, so this is the UI-only change the spec scoped. Client typecheck, lint, and format pass.

## Checklist verification

- ✅ Lists "Composed module" as a creatable kind producing `kind: "bundle"` — `EditableKind`/`KINDS` extended; `KIND_LABELS` renders the friendly label.
- ✅ Multi-select of existing modules; selections persist to `modules` — picker bound to `s.modules`; `toRecord` sets `record.modules`.
- ✅ Self-reference impossible (own id filtered via `m.id !== fullId`); empty selection rejected (`pick at least one module`).
- ✅ Saved bundle file has `kind: "bundle"` + chosen `modules` — validated by the existing module schema on save.
- ✅ No change to `core/schema/index.ts` or `agents/compose.ts`.

## Non-blocking

- The bundle picker omits the kind-color dots and the live `CompositionMap` preview that `AgentForm` shows; functional but a minor visual-parity gap. Acceptable for this scope.
- The picker markup/styled-components are replicated inline rather than extracted into a shared `<ModulePicker>` used by both forms. Intentional (keeps `AgentForm` untouched, matches declared scope); a future DRY-up could extract it.

## Security & edge cases

- UI-only change; no filesystem or command surface touched.
- Bundle-of-bundle and dedup are handled server-side by `resolveModules` (cycle guard + dedup); locked module ids remain selectable as bundle children, which is valid.
- `fromModule` now preserves `kind: "bundle"` (previously coerced to `section`) — only reachable for `source === "custom"` modules, so no built-in/`status-transition` leakage.

## Notes

Split from the same analysis session as **N138**. This is the quick UI win; N138 is the larger feature it pairs with.

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-17
**Verdict:** approved

### Blockers

- None.

### Suggestions (non-blocking)

- None.

### Notes

- _"okej approved great create pr if not exist via gh and merge it into master thanks"_ — approved; landed via PR merged to `main`.
