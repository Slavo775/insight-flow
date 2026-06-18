# N148 — flow-editor relation picker — status change vs handover (auto/gated) — Checklist

## Done criteria

- [ ] Connect overlay offers trigger (optional) + "Handover to this agent" toggle + auto/gated select
- [ ] Edge-edit modal can add/change/remove handover on an existing edge
- [ ] `edge.handover` persists via FlowDraft → Save (ProjectPage CRUD); round-trips on reload
- [ ] Works for built-in source agents (writes project-scoped edge, no agent file touched)
- [ ] Trigger and handover are independent in the UI (can set either/both/neither)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` (package + client) passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions to existing FlowEditor edge CRUD

## Verification

- [ ] In play/is-test: add handover (auto) on an edge → Save → reload shows it persisted in project JSON
- [ ] Built-in source edge handover saves without writing the agent
