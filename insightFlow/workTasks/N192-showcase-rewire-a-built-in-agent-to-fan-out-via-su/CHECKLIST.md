# N192 — Showcase: rewire a built-in agent to fan out via subagents — Checklist

## Done criteria

- [ ] One built-in agent chosen (recommended: `task-review`) and its specialized subagents authored as built-in subagent modules (N190 kind)
- [ ] Subagents declared on the agent via `subagents` (N191); composed definition (`src/agents/composed/<agent>.json`) updated
- [ ] Canonical role prompt rewritten to delegate + synthesize; `scripts/sync-role-templates.mjs` re-run so `*_ROLE.md` + templates stay in sync (drift guard passes)
- [ ] Placement decided (registry-only vs default-flow `install` list) and documented
- [ ] Graceful degradation: the agent still completes with zero subagents (Cursor or none)
- [ ] Docs: short "fan-out" note in the relevant section

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes (incl. role-file drift guard)
- [ ] `pnpm build` + `pnpm --dir website build` pass

## Verification

- [ ] Installing the default flow emits the review subagents (per placement) and the agent prompt instructs fan-out + synthesis
- [ ] Works on Claude and Cursor; with no subagents present the agent still produces its normal output
