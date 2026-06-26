# N189 — Structured handover intent — when/reason per handover candidate — Checklist

## Done criteria

- [ ] Optional `when` (string) added to the edge `handover` object + the `handover` module kind in `core/schema/index.ts`
- [ ] `AgentHandover` carries `when?`; preserved through `flowHandoversByAgent` (`agents/flow-install.ts`)
- [ ] `handoverSection` renders the reason per candidate (single + multi forms)
- [ ] Flow editor shows/edits `when` on a handover edge and round-trips via the project PUT
- [ ] Backward compatible: handovers without `when` render exactly as today

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes (flow-status / compose / flow-edit)
- [ ] No regression in existing handover rendering

## Verification

- [ ] A flow with two `when`-carrying handovers from one agent composes a `## Handover` section listing both reasons
- [ ] The flow editor displays and persists `when`
