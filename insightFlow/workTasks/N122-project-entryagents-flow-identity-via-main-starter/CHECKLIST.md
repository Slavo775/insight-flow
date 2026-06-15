# N122 — Project.entryAgents — flow identity via main/starter agent(s) — Checklist

## Done criteria

- [ ] ProjectSchema.entryAgents (subset of agents), validated
- [ ] Default flow declares entry agents; empty flagged not-selectable-by-agent
- [ ] Flow page shows main agent(s); editor marks/unmarks (multiple)
- [ ] Exposed via /api/project[s]

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] schema subset + default entry agents + editor toggle verified
