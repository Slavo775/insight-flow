# N133 — Agent role prompts emit status via the flow — Checklist

## Done criteria

- [ ] Transition wording/targets derive from status-transition modules via N131
- [ ] Custom flow agents emit the flow's custom statuses
- [ ] Default roles byte-identical (canonical)
- [ ] End-to-end custom-status lifecycle works

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] default role parity + custom-status emission + drift suite verified
