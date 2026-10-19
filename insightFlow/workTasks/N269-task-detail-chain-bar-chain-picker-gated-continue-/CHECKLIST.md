# N269 — Task detail: chain bar, chain picker, gated "Continue to next flow" — Checklist

## Done criteria

- [ ] `POST /api/work-tasks/:id/chain` binds/clears chain via N267 core fn; `locked` → 409, unknown → 400; SSE change emitted
- [ ] `POST /api/work-tasks/:id/chain-advance` advances via N267 core fn; errors mapped (non-terminal / no link / ambiguous → 400 with candidates)
- [ ] `api.ts`: `setTaskChain`, `chainAdvance`
- [ ] `ChainBar` renders flows in chain order with done/current/next states derived from `statusHistory[].flowId`
- [ ] Chain picker on task detail; enabled only while `ready`; `none` clears
- [ ] Continue button appears only at a terminal with ≥1 outgoing link; menu with `when` when several
- [ ] After advance: page refreshes (SSE) and shows "Run `/<entry-command>`"
- [ ] Task without `chainId`: no bar, no picker value, no button — page unchanged

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes (new endpoint + ChainBar tests)
- [ ] `pnpm build` passes; no console errors on `/task/:id`

## Verification

- [ ] Playground: chained task at `merged` → Continue → `ready` in next flow, bar advances
- [ ] Two links from one terminal → menu lists both with `when`; chosen one applied
- [ ] Non-ready task → picker disabled with lock hint
- [ ] Unchained task → detail page identical to before
