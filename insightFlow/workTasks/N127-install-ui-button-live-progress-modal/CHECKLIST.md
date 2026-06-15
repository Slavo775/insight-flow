# N127 — Install UI — button + live progress modal — Checklist

## Done criteria

- [ ] Install button + plan modal on the flow page
- [ ] Live per-step progress from SSE (pending/running/done/failed)
- [ ] Summary + dismiss + re-run
- [ ] Default flow installable

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] playground install-watch flow (plan → live steps → summary) verified
