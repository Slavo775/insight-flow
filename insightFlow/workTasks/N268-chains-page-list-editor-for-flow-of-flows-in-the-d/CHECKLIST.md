# N268 — Chains page: list + editor for flow-of-flows in the dashboard — Checklist

## Done criteria

- [ ] `api.ts` has `listChains`, `getChain`, `createChain`, `updateChain`, `deleteChain`
- [ ] Routes `/chain`, `/chain/new`, `/chain/:id`, `/chain/edit/:id` registered; nav item visible next to Flows
- [ ] `ChainPage` lists chains and shows detail (flows in order, links table with mode/when)
- [ ] `ChainEditor` renders one node per flow; right ports = terminal statuses only; left port = entry
- [ ] Drag terminal → flow creates a link; edge modal edits `mode` and `when`; delete edge works
- [ ] Inline validation: `to` must have an entry agent; Save disabled on error
- [ ] `ChainForm` create/edit/delete round-trips through `/api/chains` with revision header
- [ ] Optional `layout` persisted and restored
- [ ] Empty state shown when no chains exist

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] `pnpm build` passes; no console errors on `/chain`

## Verification

- [ ] Playground: create `default → custom:release-manager on merged (gated)` in UI → `insightFlow/chains/<id>.json` written
- [ ] Reload `/chain/<id>` → same links, mode, when, layout
- [ ] `insight-flow chain-advance` (N267) accepts the UI-authored chain
- [ ] Non-terminal statuses expose no output port
