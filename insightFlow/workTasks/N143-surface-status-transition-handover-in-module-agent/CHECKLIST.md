# N143 — surface status-transition + handover in module/agent editors (CRUD, locked read-only) — Checklist

## Done criteria

- [ ] `status-transition` + `handover` added to `EditableKind`/`KINDS`/`KIND_LABELS` in `ModuleForm.tsx`
- [ ] Kind-specific field sets render: status-transition (agent, sets, from?) and handover (to, on?, mode toggle default gated, label?)
- [ ] `toModule`/`fromModule` round-trip the new fields
- [ ] `AgentForm` can add/reorder/remove these end-of-turn modules inline
- [ ] Locked canonical modules (from N142) are read-only in both editors
- [ ] `kindColor` has entries for both new kinds (badges render)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] Client build (`pnpm --dir packages/taskflow run build`) succeeds
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions to existing module/agent CRUD

## Verification

- [ ] In `pnpm play`: create handover module → attach to custom agent → save → reload; fields persist + badge shows
- [ ] Attempting to edit a locked canonical handover is blocked
- [ ] Invalid save (empty `to`) shows inline validation error
