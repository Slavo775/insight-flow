# N106 — Module create/edit form (kind-specific, Claude+Cursor targets) — Checklist

## Done criteria

- [ ] Form creates/edits all five kinds with kind-specific fields
- [ ] Harness target (claude/cursor/both) persisted
- [ ] Server validation errors map to fields inline
- [ ] Built-ins read-only; custom delete handles 409

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] One module per kind created via UI in playground, each visible and valid
