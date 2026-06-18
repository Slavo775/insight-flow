# N155 — custom-flow statuses selectable in status/trigger pickers — Checklist

## Done criteria

- [ ] `FlowEditor.TriggerOptions` lists the flow's `Project.statuses` (N128) + custom states + canonical (deduped)
- [ ] `ModuleForm` `sets`/`on`/`from` pickers implement the chosen minimal flow-aware behavior (documented)
- [ ] Canonical statuses remain available in every picker (no regression)
- [ ] No schema or task-status-storage change

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes

## Verification

- [ ] In play with a custom-status flow: trigger/status pickers offer the flow's own statuses; canonical still present
- [ ] Open question resolved + noted in PR (ModuleForm global-module behavior)
