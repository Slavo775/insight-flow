# N114 — Flow editor — add/remove agents in edit mode (palette + node popover) — Checklist

## Done criteria

- [ ] Editor draft carries `agents`; Save persists it
- [ ] Add-agent palette lists registry agents not already in the flow; adding shows a node
- [ ] Node click (edit mode) → popover → Remove drops the node + its incident edges
- [ ] Read-mode node navigation unchanged; unused-state note documented

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Add + remove round-trip verified in the playground (node and incident edges persisted/removed across Save+reload)
