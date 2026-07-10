# N200 — Composer analyze v2 — flow/agent/module design strategist + custom-only rule + model context — Checklist

## Done criteria

- [x] `authoring-analyze/identity` rewritten to enforce the ordered method: Intent (flow/agent/module) → Goal → flow-first design → agents → modules → reuse pass → impact pass → MCP-discovery pass.
- [x] Role body states: analyze-only (builds nothing), gated handoff to Composer Taskmaster, custom-only discipline, and secret-placeholder planning.
- [x] Role body defines the `ANALYSIS.md` output contract (Goal · Flows · Agents · Modules · Reuse & impact table · MCP servers + secrets · Open questions · Sources) and states it is written after the gated handoff creates the task folder.
- [x] `plain-language` composed into `authoring-analyze` (and the other 7 authoring agents).
- [x] `COMPOSER_RULES` tightened: built-in defaults are read-only; a change to a built-in becomes a `custom:` variant; in-place edit allowed only for the user's own `custom:` defs. Locked tier unchanged.
- [x] Plain-language model primer added to `CONVENTIONS_MODULE_BODY` / `describeComposer` (modules→agents→flows, entry/terminator, gated vs auto handover, MCP discovery + secrets).
- [x] New built-in `mcp-server` registry-search module authored, registered in `compose.ts`, and added to `composer-authoring`'s `install` list. Secret `${SMITHERY_API_KEY}` placeholder + inputs metadata (Smithery Toolbox needs a key).

## Quality gates

- [x] `pnpm build` passes
- [x] `pnpm --dir packages/taskflow test` passes (319 tests, incl. 4 new N200 assertions)
- [x] Lint / typecheck clean (typecheck clean; `eslint src` = 0 errors; 2 pre-existing warnings in untouched `FlowEditor.tsx`)
- [x] No regressions in the other 7 authoring agents' composed output (drift guard on the 9 shipped roles still byte-identical; full suite green)

## Verification

- [x] Composed `authoring-analyze` renders the ordered method + `## Plain language` section (smoke render + test).
- [x] `flowInstallPlan(composer-authoring)` includes the registry-search MCP (`mcp` step, key `mcp-registry`) — asserted in test.
- [x] Registry server (Smithery Toolbox) needs a key: `flowRequiredInputs` surfaces `SMITHERY_API_KEY` as a secret; role text instructs the user to fill `.insight-flow/secrets.local.json`.
- [x] Smoke: composed `authoring-analyze` prompt reads as intended — analyze-only, custom-only, flow→agent→module order.
