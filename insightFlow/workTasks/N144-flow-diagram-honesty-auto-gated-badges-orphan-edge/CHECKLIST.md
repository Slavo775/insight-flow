# N144 — flow-diagram honesty — auto/gated badges + orphan-edge warnings — Checklist

## Done criteria

- [ ] Pure `isEdgeBackedByHandover(edge, handovers)` helper added + unit-tested
- [ ] Each edge renders an auto/gated mode badge in both `FlowMap` and `FlowEditor`
- [ ] Backed vs orphan edges are visually distinct
- [ ] Orphan edges listed in a non-blocking warning in the editor
- [ ] Legend/tooltip explains auto vs gated + orphan meaning
- [ ] No change to task behavior / status writes / handover picking

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] Client build succeeds
- [ ] `pnpm --dir packages/taskflow test` passes (incl. new helper test)
- [ ] No regressions to existing FlowEditor edge CRUD

## Verification

- [ ] In `pnpm play`: backed edge shows mode badge; unbacked edge renders orphan + appears in warning list
- [ ] Toggling an agent's handover (N143) flips an edge between backed/orphan on reload
