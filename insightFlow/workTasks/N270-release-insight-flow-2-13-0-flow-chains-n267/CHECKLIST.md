# N270 — Release insight-flow 2.13.0 — flow chains (N267) — Checklist

## Done criteria

### Docs gaps (from the release check — each must be closed)

- [x] `cli/git-and-flow.md`: the hint is printed by lifecycle commands, not the raw `status` override; fix stray leading space (~l.72); add `set-chain` to the "run yourself" note (~l.14)
- [x] `cli/index.md` l.42: Git & Flow row lists `set-chain`, `chain-advance`
- [x] `cli/tasks-and-query.md`: `create --chain <chainId>` flag documented
- [x] CLI help (`src/cli/cli.ts` ~l.138) + README l.209: `chain-advance … [--by <agent>]`
- [x] `set-chain` re-seat behaviour documented (`git-and-flow.md` ~l.33, README ~l.208)
- [x] `concepts/handover.md`: "Chain handovers (flow → flow)" section (third kind)
- [x] `concepts/flows.md` + `concepts/index.md`: chain binding order + `Task.chainId` / `statusHistory[].flowId`
- [x] Authoring docs name chains: `authoring/index.md` l.22, `authoring/walkthrough.md` l.19, `authoring/agents-and-subagents.md` l.64, `composer-mcp/index.md` l.78
- [x] `composer-mcp/tools.md`: chain limits/rules, chain fields in `list`/`get`, `#chains-flow--flow` anchor
- [x] `flow/statuses.md` "Terminal vs. active": chain links start at a terminal
- [x] `guides/custom-flow.md` ~l.89–93: chained task stays in its chain
- [x] `guides/troubleshooting.md`: broken chain file entry
- [x] README "Composer MCP" (~l.668): chain kind + `describe`
- [x] (optional) root `CLAUDE.md` subcommand list: `set-chain`, `chain-advance` (also `advance`, `set-flow`)
- [x] Extra: `composer-mcp/index.md` registry sentence and the `mcp` CLI help line mention chains

### Release steps

- [ ] Docs commit pushed to `feat/N267-flow-chains` (PR #174)
- [ ] Release check re-run → docs complete → `ready-to-release`
- [ ] PR #174 merged to `main` (squash, `feat(flows): …` title) → release-please opens the 2.13.0 release PR
- [ ] Release PR merged (human-approved) → tag `v2.13.0`, npm publish approved + succeeded
- [ ] Rollout: global binary reinstalled; N267 recorded `merged` + `done` on `main`

### Decision (human)

- [ ] Next command after a chain into `default` (`/task-analyze` today) — decided; follow-up task created if code changes

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes (cli.ts help text)
- [x] `pnpm --dir packages/taskflow test` passes (391/391 at check time; since then only two help-text lines changed — no test pins them; e2e-smoke + published-surface + flow-chains 22/22)
- [x] Docs build / link check passes — `pnpm --dir website build` OK, no broken-link/anchor warnings
- [x] No code behaviour changes in this task (help text only)

## Verification

- [ ] Docs auditor re-run reports "complete for release"
- [ ] `npm view insight-flow version` → `2.13.0`; tag `v2.13.0` present
