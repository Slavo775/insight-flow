# N149 — install-time handover composition from flow edges — Checklist

## Done criteria

- [ ] Install derives per-agent flow handovers from `project.flow` (`from===agent && edge.handover`), aliases resolved
- [ ] `composeHandoverSection` merges global (N142) + flow edge handovers, deduped, into one `## Handover` section
- [ ] Merged section emitted into the agent's installed command/skill artifact only
- [ ] Built-in source agents get the per-flow section; `COMPOSED_AGENTS` + `*_ROLE.md` unchanged
- [ ] Install endpoint passes flow/project context to the emitter

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes (incl. drift guard — global role MD byte-identical)
- [ ] No regressions to existing flow-install plan/emit

## Verification

- [ ] Unit: merge/dedupe of global + flow handovers; built-in agent install body gains section while `composeAgentById` unchanged
- [ ] Manual: install a flow with a built-in→X edge handover; emitted command has `## Handover`, global role file untouched
