# N132 — Pickers read the flow's transition graph — Checklist

## Done criteria

- [ ] Pickers derive actionability + order from the flow graph
- [ ] Default flow reproduces today's STATUS_WEIGHT order exactly
- [ ] Custom-flow tasks picked in their own order; mixed coherent
- [ ] All three pickers covered

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] default-parity (3 pickers) + custom order + mixed verified
