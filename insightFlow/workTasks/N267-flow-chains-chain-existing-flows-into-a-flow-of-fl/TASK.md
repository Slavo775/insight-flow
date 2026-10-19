# N267 — Flow chains: chain existing flows into a flow-of-flows (core + CLI)

**Type:** feat
**Priority:** high
**Created:** 2026-10-19

## Problem

- A task is bound to exactly one flow (`Task.flowId`, N116) and the flow locks once work starts (`cli/commands/set-flow.ts:44`, N117). Handovers (edge `handover` N147, module `handover` N142) chain **agents inside one flow** only.
- A task cannot continue from one flow into another: when the next flow's agent writes its status, `setStatus` (`core/set-status.ts`) rejects it because the status is not in the task's current flow. Today the only workaround is one giant flow, which cannot be reused.
- Users want to chain flows (e.g. prepare → implement → deploy-beta → …) with the same `auto | gated` semantics agents already have, and reuse one flow in many chains.

## Goal

1. A new `chain` definition (`insightFlow/chains/<id>.json`) links **existing, unmodified** flows: nodes are flow ids, links go from a **terminal** status of flow A to flow B with `mode: auto | gated` (default `gated`) and optional `when`.
2. `Task.chainId` (optional). A task without a chain behaves byte-identically to today.
3. CLI: `create --chain <id>`, `set-chain` (ready-only), `chain-advance` (moves the task to the next flow + `ready` in one write; history records the flow change).
4. The shared status writer prints a **chain hint** when a chained task reaches a terminal that has outgoing links — the handover is resolved at run time, so a reused flow needs no prompt-time wiring and chains need no install.
5. Chains are readable/writable via the custom-definitions API (`/api/chains`) and the protocol has one new rule for CLI-printed chain handovers.

## Scope

### In scope

- `packages/taskflow/src/core/schema/index.ts` — `ChainLinkSchema` `{ from, on, to, mode: auto|gated = gated, when? }`, `ChainSchema` `{ id: DefinitionIdSchema, title, description?, flows: string[] (min 1, ordered — `flows[0]` is the entry flow), links: ChainLink[] }`. superRefine: link `from`/`to` ∈ `flows`; no duplicate `(from,on,to)`. `StatusHistoryEntrySchema` gains optional `flowId` (additive).
- `packages/taskflow/src/core/types.ts` — `Task.chainId?: string`; `TaskSchema.chainId: z.string().optional()`.
- `packages/taskflow/src/agents/user-registry.ts` — add `"chains"` to `USER_SPACE_DIRS`; `loadUserRegistries` reads `chains/`; `mergedChains()` (no built-ins — only user space). At load, validate each link: `from`/`to` are known flows (`mergedProjects()`), `on` is a `terminal: true` status of flow `from`, and flow `to` has ≥1 `entryAgents` (otherwise the hint cannot name a command).
- `packages/taskflow/src/cli/commands/create.ts` — `--chain <id>`: unknown chain → exit 1. If `--flow` is absent, `flowId = chain.flows[0]`; if present, it must be one of `chain.flows`.
- `packages/taskflow/src/cli/commands/set-chain.ts` (new) — `setTaskChain(config, master, id, chain)` with the same ready-only / unknown guards as `set-flow.ts`; `--chain none` clears. If `task.flowId ∉ chain.flows`, also set `flowId = chain.flows[0]`. CLI: `set-chain --id Nxx --chain <id|none>`.
- `packages/taskflow/src/core/chain.ts` (new, pure) — `chainLinksFrom(chain, flowId, status)` and `isTerminalOf(flow, status)`; reused by `chain-advance`, `status-write`, and the dashboard later (N268/N269).
- `packages/taskflow/src/cli/commands/chain-advance.ts` (new) — `chain-advance --id Nxx [--to <flowId>] [--by <agent>]`: requires `chainId`; requires `task.status` to be a terminal of the current flow; resolves links via `chainLinksFrom`; 0 links → error; >1 and no `--to` → error listing candidates with `when`; `--to` must be a candidate. Single write: `task.flowId = to`, then `setStatus(task, "ready", { by, at }, nextFlow)` with a history entry carrying `flowId: to`. Prints `{ action: "chain-advanced", id, from, to, mode, next: { agentId, command } }` where `command = "/" + deriveCommandName(entryAgents[0])`.
- `packages/taskflow/src/cli/commands/status-write.ts` — after `setStatus`, if `task.chainId` and the target is a terminal with ≥1 outgoing link, print **to stderr** (stdout JSON stays parseable) one line per link: `chain next: flow <to> — run \`insight-flow chain-advance --id <id> --to <to>\` then \`/<entry-command>\` (mode: gated|auto)[ — when: <when>]`. Must fire for every lifecycle command and for `advance` (both route through `writeStatus`).
- `packages/taskflow/src/cli/cli.ts` — register `set-chain`, `chain-advance`; help text; `create --chain`.
- `packages/taskflow/src/dashboard/server/custom-defs.ts` — `Kind` + `KINDS` + route regex gain `chains`; `kindFromTarget` gains `"chain"`. `dashboard/server/index.ts` — `GET /api/chains` lists merged chains (mirror `GET /api/projects`, `index.ts:1222`).
- `AGENT_PROTOCOL.md` (root, then `pnpm --dir packages/taskflow run sync-role-templates` or the script in `scripts/sync-role-templates.mjs`) — under HANDOVER DISCIPLINE add: *"CHAIN HANDOVER — when a CLI status write prints `chain next:` lines, treat each as a handover with the stated mode. `gated` = stop and get an explicit human go-ahead; `auto` = run `chain-advance` then the named command. Pick one line that matches `when`; never fan out. The flow lock does not apply — the chain moves the task at a terminal only."*
- `packages/taskflow/README.md` + `docs/` command reference: `create --chain`, `set-chain`, `chain-advance`, `insightFlow/chains/` layout.
- Tests (`packages/taskflow/test/`, `node:test`): `chain-schema.test.mjs` (valid/duplicate/unknown-flow/non-terminal `on`), `chain-advance.test.mjs` (happy path, 0 links, 2 links without `--to`, non-terminal status, no chainId, history entry has `flowId`), `set-chain.test.mjs` (ready-only, `none`, flow re-seat), `status-write` hint test (stderr line present only for chained task at a terminal with links), `custom-defs-api` test extended for `chains`.

### Out of scope

- Dashboard UI: Chains page/editor (N268), task-detail chain bar + chain picker + "Continue to next flow" button (N269).
- ~~Composer MCP tools for chains and `/task-authoring-*` support — later task.~~ Pulled into scope by the human review (Round 2): see CHECKLIST "Review fixes".
- Handover files (`HANDOVER.md`) — the task keeps its folder and history across flows.
- Fan-out / join (one task → many, many → one). One task, one path.
- Auto-binding a chain by entry agent (binding is explicit: `--chain` or `set-chain`).
- Rendering chain handovers into agent prompts at flow-install time (run-time hint only).
- Changing existing flow files or the flow lock rule.

## Implementation plan

1. **Schema + types** — `ChainLinkSchema`, `ChainSchema`, `Task.chainId`, `StatusHistoryEntry.flowId?`. Export `Chain` type from `core/types.ts` and the barrel `src/index.ts`.
2. **Registry** — `chains` in `USER_SPACE_DIRS`; `mergedChains()`; cross-registry link validation at load with the same `TaskflowValidationError` shape as projects.
3. **Pure helpers** — `core/chain.ts`: `isTerminalOf`, `chainLinksFrom`, `chainEntryCommand(flow)` (first `entryAgents` → `deriveCommandName`).
4. **CLI binding** — `create --chain`; `set-chain` (new file, shared core fn so N269 can reuse it from the dashboard, like `setTaskFlow`).
5. **`chain-advance`** — new command; single shard write; `--to` disambiguation; JSON output with `next`.
6. **Hint** — `status-write.ts` prints `chain next:` lines to stderr after a successful write; verify `advance` and every `*-end` command route through it.
7. **API + protocol + docs** — `custom-defs.ts` `chains`; `GET /api/chains`; `AGENT_PROTOCOL.md` rule + template sync; README/docs.
8. **Tests** — as listed in scope; run the full suite.

## Verification

- `pnpm --dir packages/taskflow test` — new tests pass, existing flow tests untouched.
- `pnpm build` + `npx tsc --noEmit` + `npm run lint` (pre-commit runs prettier/eslint/typecheck).
- Manual in `playground/`: write `insightFlow/chains/demo.json` `{ flows: ["default","custom:release-manager"], links: [{ from: "default", on: "merged", to: "custom:release-manager" }] }`; `insight-flow create --title x --chain demo` → `flowId: default`, `chainId: demo`; walk the task to `merged` → stderr shows `chain next: flow custom:release-manager …`; `insight-flow chain-advance --id Nxx` → `flowId: custom:release-manager`, `status: ready`, history entry has `flowId`; `insight-flow show Nxx` reflects it; `chain-advance` on a non-terminal status errors; a task without `chainId` prints no hint and never changes flow.
- `curl localhost:6006/api/chains` lists the chain; `POST /api/chains` with a link whose `on` is not terminal → 400.

## Notes

- Analysis and decision log: `ANALYSIS.md` in this folder.
- Related: N116 (flowId), N117 (flow lock — intentionally kept; chains move at a terminal only), N128/N131 (flow-validated status set), N133 (`advance`), N147/N149/N189 (edge handovers, `when`), N169 (terminal statuses), N194 (built-in project registry).
- Gotcha: `setStatus` validates against the flow passed in — set `task.flowId = to` **and** pass the *next* flow, or `ready` may be rejected (e.g. a flow that renames `ready`). If the next flow has no `ready` status, fail with a clear error; do not fall back to canonical.
- Gotcha: `chains/` is user-space only; `mergedChains()` must degrade like `knownFlows()` (`set-flow.ts:16`) — a malformed chain file must never break a default-flow lifecycle command (hint printing is best-effort, wrapped in try/catch).
- Follow-ups: N268 (Chains page + editor), N269 (task-detail chain bar, picker, gated "Continue" button).
