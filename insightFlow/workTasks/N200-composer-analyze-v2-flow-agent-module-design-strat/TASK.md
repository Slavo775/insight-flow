# N200 — Composer analyze v2 — flow/agent/module design strategist + custom-only rule + model context

**Type:** feat
**Priority:** medium
**Created:** 2026-07-02

## Problem

- The composer flow's entry agent `authoring-analyze` ("Authoring Analyst") turns a request into a brief and delegates reuse checks to 4 subagents, but it has **no explicit design method**: it does not force intent detection (whole flow / agent / module), a stated goal, or a top-down design order (flow → agents → modules). It does not compose the `plain-language` module (so its output is not simple English), it produces no `ANALYSIS.md` artifact, and it gives no guidance for discovering MCP servers or planning MCP secrets.
- The shipped composer conventions (`composer-conventions.ts`) currently **allow editing an unreferenced built-in in place** (reuse rule #2). We want the stricter, upgrade-safe discipline: built-in defaults are **read-only**; any change to one becomes a `custom:` variant. The conventions also lack a plain-language "how the model works" primer (modules → agents → flows, entry point, terminator/finish, gated vs auto handover).

## Goal

1. `authoring-analyze` enforces a fixed method: **Intent → Goal → design flow-first → agents → modules → reuse pass → impact pass → MCP-discovery pass (with secret-placeholder planning)** — and builds nothing.
2. The analyst's output is written in simple English (composes `plain-language`) and produces an `ANALYSIS.md` with composer-specific sections (Goal · Flows · Agents · Modules · Reuse & impact · MCP servers + secrets · Open questions · Sources), written only **after** the gated handoff to the Composer Taskmaster creates the task folder.
3. A strict **custom-only** rule ships in the composer conventions: built-in defaults are read-only; changing one produces a `custom:` variant (replacing the current in-place-eject rule #2).
4. `composer-conventions.ts` gains a plain-language **model primer** (modules → agents → flows, entry/terminator, gated vs auto handover, MCP discovery + secrets).
5. A **registry-search MCP** is wired into the `composer-authoring` flow so the analyst can discover MCP servers programmatically.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/roles/authoring.json` — rewrite `authoring-analyze/identity` body to encode the fixed method, the analyze-only rule, the custom-only reference, MCP-discovery + secret-planning, and the `ANALYSIS.md` output contract.
- `packages/taskflow/src/agents/composer-conventions.ts` — tighten `COMPOSER_RULES` (custom-only; defaults read-only; replace in-place-eject rule #2 with "always a `custom:` variant"); add a plain-language model primer + MCP-discovery + secrets guidance into `CONVENTIONS_MODULE_BODY` / `describeComposer`.
- `packages/taskflow/src/agents/composed/authoring.json` — add `plain-language` to `authoring-analyze` (and the other 7 authoring agents — cheap win, consistent voice).
- New built-in **`mcp-server` module** for registry search (Official MCP Registry, no-auth read recommended) + add its id to `composer-authoring`'s `install` list in `packages/taskflow/src/agents/project/authoring.json`.
- `packages/taskflow/src/agents/compose.ts` — register the new module; `packages/taskflow/src/core/schema/index.ts` — only if a schema field is needed.
- `packages/taskflow/test/compose.test.mjs` — assert the new method + `plain-language` render, and the flow-install plan includes the registry MCP.

### Out of scope

- Base `task-analyze` role (`TASK_ANALYZER_ROLE.md`) — untouched.
- New flow primitives, custom states, or schema redesign.
- Dashboard UI for the composer.
- Actual authoring of any consumer custom defs — this task ships insight-flow's **own** built-in composer upgrade.

## Implementation plan

1. **Rewrite `authoring-analyze/identity`** — encode the ordered method (Intent: whole flow / one agent / one module → Goal in one sentence → design top-down: flow first [agents, relations, handovers `auto`/`gated`, entry point, terminator/finish], then agents [hooks/mcp/skills/subagents], then modules → reuse pass via the 4 analyst subagents → impact pass [is a reuse candidate referenced elsewhere? reuse-as-is / new custom / eject-to-custom, and how to adjust] → MCP pass [discover via registry MCP; if a server needs a key, plan a `${VAR}` placeholder and tell the user to fill `secrets.local.json`]). State analyze-only, gated handoff, and the custom-only rule. Add the `ANALYSIS.md` output contract.
2. **Tighten `COMPOSER_RULES`** (`composer-conventions.ts`) — replace reuse rule #2 (in-place edit of unreferenced built-ins) with: built-in defaults are **read-only templates**; any change to a built-in becomes a `custom:` variant. Keep in-place edit allowed only for the user's *own* `custom:` defs. Keep the locked tier.
3. **Add the model primer** — a short plain-language section in `CONVENTIONS_MODULE_BODY` / `describeComposer`: what modules/agents/flows are, how they nest, entry point, terminator/finish, gated vs auto handover, subagents-for-fan-out, MCP discovery + secret placeholders.
4. **Compose `plain-language`** into `authoring-analyze` (and the other authoring agents) in `composed/authoring.json`.
5. **Author the registry-search `mcp-server` module** — recommend the Official MCP Registry (`registry.modelcontextprotocol.io`, no-auth read); add `inputs`/`${VAR}` + user note only if the chosen server needs a key. Register it in `compose.ts`; add its id to `project/authoring.json`'s `install` list.
6. **ANALYSIS.md sequencing** — confirm the analyst writes `ANALYSIS.md` after the gated handoff to `authoring-create` (folder exists only post-create); document that in the role body.
7. **Tests** — extend `compose.test.mjs`: composed `authoring-analyze` renders the method + `## Plain language`; `flowInstallPlan(composer-authoring)` includes the registry MCP; schema still valid.

## Verification

- `pnpm build` and `pnpm --dir packages/taskflow test` pass; lint clean (pre-commit husky: prettier + eslint --fix + typecheck).
- `insight-flow prompt-build --compose authoring-analyze` renders the new ordered method and the `## Plain language` section.
- The `composer-authoring` flow-install plan lists the registry-search MCP; if it needs a secret, install prompts for the `${VAR}` and the role text tells the user to fill `secrets.local.json`.
- Smoke: render the composed `authoring-analyze` prompt and confirm it reads as intended (analyze-only, custom-only, flow→agent→module order).

## Notes

- The "context for the flow" the user asked for already largely exists in `composer-conventions.ts` (`COMPOSER_RULES` + `KIND_SHAPES` + `describeComposer` + the `composer-authoring-conventions` module + the composer MCP `describe` tool). This task **extends** it — no new orphan doc.
- Custom-only rationale: editing a shipped built-in in place makes it un-upgradable; a `custom:` variant keeps defaults pristine and package-upgradable.
- "Don't touch node_modules" is already structural — even an eject writes to the project's `insightFlow/` space, never `node_modules`. The custom-only rule is a design discipline, not a filesystem fix.
- MCP discovery: mcpmarket.com is browse-only (no public API); the Official MCP Registry has a no-auth read REST API; Smithery/PulseMCP/Glama have their own APIs. See `ANALYSIS.md` Sources.
- Related: builds on the composer-authoring flow (N195) and the `plain-language` module (N199). See `ANALYSIS.md` in this folder.
