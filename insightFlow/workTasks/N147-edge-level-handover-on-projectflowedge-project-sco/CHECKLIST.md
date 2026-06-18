# N147 — edge-level handover on ProjectFlowEdge (project-scoped, trigger-independent) — Checklist

## Done criteria

- [ ] `ProjectFlowEdgeSchema` has optional `handover: { mode: enum(auto|gated) default gated }`, independent of `on`
- [ ] `FlowEdge` (core/flow-status.ts) + `ProjectDto.flow` (api.ts) carry `handover?`
- [ ] Edges without `handover` validate unchanged (back-compat)
- [ ] N142 agent-module handover + canonical global handovers untouched

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` (package + client) passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions to existing flow/project schema validation

## Verification

- [ ] Schema test: edge with `{handover:{mode:"auto"}}` parses; edge without `handover` parses; `handover.mode` defaults to `gated`
