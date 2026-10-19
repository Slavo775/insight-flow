# N267 — Flow chains: chain existing flows into a flow-of-flows (core + CLI) — Checklist

## Done criteria

- [x] `ChainSchema` / `ChainLinkSchema` exist in `core/schema/index.ts`; `Chain` type exported from `src/index.ts` (defined next to the schema as `z.infer`, like `LogInput` — `core/types.ts` has no imports)
- [x] `Task.chainId` optional; a task without it serialises identically to today (no new key written)
- [x] `StatusHistoryEntrySchema.flowId` optional; existing shards still validate
- [x] `insightFlow/chains/*.json` loaded by `loadUserRegistries`; `mergedChains()` exported; link validation (known flows, `on` is terminal of `from`, `to` has an entry agent) raises `TaskflowValidationError`
- [x] `core/chain.ts` pure helpers: `isTerminalOf`, `chainLinksFrom`, `chainEntryCommand`
- [x] `insight-flow create --chain <id>` binds chain; sets `flowId = flows[0]` when `--flow` absent; rejects unknown chain / `--flow` not in chain
- [x] `insight-flow set-chain --id Nxx --chain <id|none>` — ready-only, unknown-chain guard, re-seats `flowId` when not in chain; shared core fn like `setTaskFlow`
- [x] `insight-flow chain-advance --id Nxx [--to <flow>]` — terminal-only, resolves links, errors on 0 / ambiguous links, single write sets `flowId` + `ready` + history entry with `flowId`, prints `next.command`
- [x] `status-write.ts` prints `chain next:` lines to stderr for a chained task at a terminal with links; nothing for unchained tasks; works via lifecycle commands and `advance`
- [x] `custom-defs.ts` handles `POST/PUT/DELETE /api/chains[/:id]`; `GET /api/chains` lists merged chains
- [x] `AGENT_PROTOCOL.md` CHAIN HANDOVER rule added and synced into `packages/taskflow/templates/roles/`
- [x] README + docs command reference updated (`create --chain`, `set-chain`, `chain-advance`, `chains/` layout)
- [x] `cli.ts` help lists the new commands

## Quality gates

- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (0 errors; 2 old warnings in `FlowEditor.tsx`, not from this task)
- [x] `pnpm --dir packages/taskflow test` passes (new + existing) — 384/384; new tests in `test/flow-chains.test.mjs` (one file instead of four) + `custom-defs-api.test.mjs`
- [x] No regressions: `flow-binding`, `flow-statuses`, `default-flow`, `custom-defs-api` tests unchanged and green

## Verification

- [x] Playground: `chains/demo.json` (default → release-manager on `merged`), `create --chain demo` → `flowId: default`, `chainId: demo` (run in a scratch copy of `insightFlow/` with the real release-manager flow)
- [x] Walk task to `merged` → stderr `chain next: flow custom:release-manager …` line; stdout JSON unchanged
- [x] `chain-advance --id Nxx` → `flowId: custom:release-manager`, `status: ready`, history entry `{ status: "ready", flowId: "custom:release-manager" }`
- [x] `chain-advance` on a non-terminal status → non-zero exit, clear error; on a task without `chainId` → error
- [x] Two links from the same terminal without `--to` → error lists both with `when`; with `--to` → succeeds
- [x] Malformed `chains/x.json` → lifecycle commands still work (warning only)
- [x] `curl /api/chains` lists; `POST /api/chains` with non-terminal `on` → 400

## Review fixes (AI Round 1 + Human Round 2)

- [x] Blocker 1 (AI): `ChainLinkSchema.when` is one line, max 200 chars — a newline can no longer forge a second `chain next:` line (`core/schema/index.ts`; schema test)
- [x] Blocker 2 (AI): `setTaskFlow` refuses a flow outside the task's chain (`outside-chain`, hint: `set-chain --chain none`); CLI `set-flow` and the dashboard flow picker share it (`cli/commands/set-flow.ts`; test)
- [x] Blocker 3 (Human): the authoring composer knows chains
  - [x] Composer MCP: `chain` kind in `list` / `get` / `describe` / `delete`, plus `create_chain` / `update_chain`; `install` / `uninstall` stay module/agent/flow (`mcp/composer.ts`)
  - [x] Shared `loadRegistriesForWrite(kind)` in `custom-defs.ts`, used by the HTTP router and the MCP — MCP chain writes detect duplicates, and MCP flow update/delete now respect chains (closes the Round 1 non-blocking "MCP bypasses chain re-validation")
  - [x] Conventions (`agents/composer-conventions.ts`): Chain in the model primer, "Flow → flow is a chain, not an edge" rule, `chain` shape for `describe`
  - [x] Relationship analyst/author/reviewer subagents + authoring analyst prompt teach chain links (`composer-subagents.json`, `roles/authoring.json`); this repo's `.claude/` authoring files regenerated via `install-flow composer-authoring`
  - [x] Docs: `website/docs/composer-mcp/tools.md`
  - [x] Test: stdio MCP round-trip (describe, create/list/get/delete chain, duplicate 409, multi-line `when` 400, non-terminal `on` 400, `update_flow` that breaks a chain refused, flow delete refused with `referencedBy`)
- [x] Cheap Round 1 test asks: non-zero exit asserted for unknown `set-chain` and bad `chain-advance --to`; a chained task at a non-terminal prints no hint
- [x] Gates: typecheck ✓, eslint ✓ (changed files), tests 386/387 — the one failure is the timing test `log-event exits within 250ms` under full-suite load; it passes alone (15/15 in the timing files)

## Round 3 non-blocking fixes

- [x] Prototype-key ids miss everywhere (`Object.hasOwn`, null-prototype chain map) + tests
- [x] `when`: no control/format chars or line/paragraph separators; printed quoted + tests
- [x] `set-flow` fails closed when the chain can't be read; one flows load + test
- [x] Conventions flow-guard wording; analyst intent names chains; authoring files regenerated
- [x] Tests: `update_chain` (ok / stale 409 / 404), malformed chain file, HTTP dup 409, dashboard `outside-chain` 400
- [x] `update_chain` description; MCP 256 KB cap; chain `title`/`description` caps
- [x] Docs: `git-and-flow.md`, README, `tools.md`
- [x] `chain-advance` unknown-flow; `writeStatus` one flows load; dangling-chain warning; hint after save; flow writes warn when the chain guard is skipped; broken chain deletable

