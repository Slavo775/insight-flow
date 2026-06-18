# N146 — orphan-edge over-flagging — resolve custom-state aliases + soften built-in-source edges — Checklist

## Done criteria

- [ ] `edgeHandover`/`isEdgeBackedByHandover` accept optional `states` and resolve `edge.on` via `resolveTrigger` before matching
- [ ] Custom-state-triggered edges are no longer falsely orphaned when a matching handover exists
- [ ] Built-in-source classifier (`AgentDto.source !== "custom"`) threaded from `ProjectPage` to `FlowMap` + `FlowEditor`
- [ ] Three-way edge rendering: backed (mode badge) · not-backed-built-in (neutral) · orphan (red ⚠, custom source); legend updated
- [ ] Back-compat: calling the helper without `states` behaves exactly as before

## Quality gates

- [ ] `pnpm --dir packages/taskflow exec tsc --noEmit` passes (package)
- [ ] client `tsc --noEmit -p src/dashboard/client/tsconfig.json` passes
- [ ] `pnpm --dir packages/taskflow test` passes (incl. new cases)
- [ ] No regressions to N144 backed/orphan behavior on the default project (still zero orphans)

## Verification

- [ ] New `flow-status.test.mjs` cases: custom-state alias resolves to backed; absent-states stays back-compat
- [ ] Manual in `is-test` "Test its working": `taskmaster → test-agent on test-ready` shows neutral "not backed (built-in)", not red orphan; a genuinely-matching custom-state edge shows backed
