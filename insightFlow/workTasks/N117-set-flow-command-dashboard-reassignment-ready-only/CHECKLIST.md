# N117 — set-flow command + dashboard reassignment (ready-only) — Checklist

## Done criteria

- [ ] `set-flow --id --flow` reassigns flowId, ready-only
- [ ] Non-ready status → clear lock error, no change
- [ ] Unknown target flow → error (CLI non-zero / API 400)
- [ ] Dashboard dropdown reassigns while ready; disabled+hint otherwise

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] ready→ok / non-ready→locked / unknown-flow→error covered by tests; dashboard reassign verified in playground
