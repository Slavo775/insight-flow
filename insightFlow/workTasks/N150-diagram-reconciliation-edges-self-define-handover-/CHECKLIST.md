# N150 — diagram reconciliation — edges self-define handover; retire orphan cross-check — Checklist

## Done criteria

- [ ] FlowMap/FlowEditor render edge styling from `edge.handover` (auto/gated) vs plain status-change — no orphan concept
- [ ] N146 orphan cross-check retired: `classifyEdge`/`EdgeBacking` (and `edgeHandover`/`isEdgeBackedByHandover` if unused) removed from flow-status.ts + index.ts
- [ ] Orphan-warning overlay + builtin-source neutral styling removed; legend simplified to status-change / handover(auto) / handover(gated)
- [ ] `handoversByAgent`/`builtinAgents` props dropped from map/editor if unused
- [ ] No dangling references (coordinate any matcher N149 still needs)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` (package + client) passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes (revised flow-status tests)
- [ ] No regressions to other FlowEditor edge CRUD

## Verification

- [ ] In play/is-test: handover edge shows auto/gated badge; plain trigger edge shows trigger only; no orphan styling
- [ ] The `taskmaster → test-agent` edge with a handover (N148) renders as handover, not orphan
