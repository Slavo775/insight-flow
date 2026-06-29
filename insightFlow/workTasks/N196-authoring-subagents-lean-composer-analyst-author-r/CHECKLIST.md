# N196 — Authoring subagents (lean) — composer-analyst/author/reviewer + dedup & best-practice — Checklist

## Done criteria

- [ ] 3 built-in `subagent` modules shipped + registered: `composer-analyst` (read-only), `composer-author`, `composer-reviewer` (read-only)
- [ ] `composer-analyst` / `composer-reviewer` prompts include dedup/reuse logic (query composer MCP `list`/`get` for existing defs before creating)
- [ ] Best-practice conventions encoded (custom: ids, baseline modules, locked-kind awareness, handover `when`)
- [ ] Wired onto N195 agents' `subagents` (analyze/implement/review at minimum)
- [ ] `tools` scoped: analyst/reviewer read-only; author has write/MCP access

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes (subagent emit + reference-safety)

## Verification

- [ ] The 3 subagents resolve, install to `.claude/agents/`, and show as referenced-by the authoring agents (agent detail view)
- [ ] Installing the authoring flow/agents emits the subagents reference-safely
