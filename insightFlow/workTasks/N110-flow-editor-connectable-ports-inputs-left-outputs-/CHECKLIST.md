# N110 — Flow editor — connectable ports (inputs left, outputs right) — Checklist

## Done criteria

- [ ] Edit-mode nodes have left input + right output handles, centered body
- [ ] Connect requires choosing a legal trigger; edge labeled
- [ ] Self-loops, duplicates, trigger-less edges blocked
- [ ] Edge delete works; state ready for N111 save

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] Related tests pass
- [ ] No regressions in affected area

## Verification

- [ ] Manual connect/delete session on a custom playground flow passes all validation behaviors
