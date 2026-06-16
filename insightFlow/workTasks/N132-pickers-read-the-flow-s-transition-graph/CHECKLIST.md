# N132 — Pickers read the flow's transition graph — Checklist

## Done criteria

- [x] `next` derives actionability + order from the task's flow (custom-status
      flows: non-terminal statuses, ordered by declared sequence); next-review/
      next-fix stay canonical (their status filters already exclude custom)
- [x] Default flow reproduces today's STATUS_WEIGHT order exactly (canonical
      flows keep STATUS_WEIGHT; verified across all three pickers)
- [x] Custom-flow tasks picked in their own order; mixed coherent (custom index
      vs canonical weight both ascending, then priority/createdAt)
- [x] All three pickers covered (tests)

## Quality gates

- [x] `npx tsc --noEmit` passes (server + client)
- [x] `npm run lint` passes (no new findings)
- [x] Related tests pass (215; +6 in `test/picker-flow.test.mjs`)
- [x] No regressions in affected area

## Verification

- [x] default-parity (3 pickers), custom-flow order, terminal exclusion, and
      review/fix non-surfacing of custom statuses verified in `test/picker-flow.test.mjs`
