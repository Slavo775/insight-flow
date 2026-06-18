# N154 — ModuleDetail/AgentDetail render handover + status-transition kinds — Checklist

## Done criteria

- [ ] `KindPanels` renders `status-transition` (agent/sets/from?) and `handover` (to/on?/mode/label?)
- [ ] `facetLabel` returns informative strings for both kinds
- [ ] `AgentDetail` legend `KINDS` includes `handover`, `status-transition`, `bundle`

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions to module/agent detail pages

## Verification

- [ ] In play: handover + status-transition detail pages show fields; agent detail legend lists the new kinds
