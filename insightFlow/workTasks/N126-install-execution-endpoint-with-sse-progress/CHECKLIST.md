# N126 — Install execution endpoint with SSE progress — Checklist

## Done criteria

- [ ] POST /api/flow-install applies the plan idempotently
- [ ] Per-step progress over SSE (started/done/failed)
- [ ] Re-run is a no-op/update (no duplicates)
- [ ] Failures surfaced without aborting silently

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] HTTP install + idempotent re-run + progress events + failure path verified
