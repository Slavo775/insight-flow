# N125 — Derive the full install plan from a flow — Checklist

## Done criteria

- [ ] flowInstallPlan collects agents' mcp/hook/skill + install list
- [ ] GET /api/flow-install-plan?id= returns targets + kinds
- [ ] Deduped, deterministic; empty flow → empty plan
- [ ] Read-only (no writes)

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] plan composition/dedup/empty verified by tests; default-flow plan inspected
