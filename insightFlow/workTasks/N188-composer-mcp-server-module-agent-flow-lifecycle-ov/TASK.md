# N188 — composer MCP server — module/agent/flow lifecycle over MCP (stdio)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-25

## Problem

insight-flow's composer registry (modules, agents, flows — built-in and custom) is only manageable through the dashboard UI and its HTTP API. There is no programmatic, agent-callable surface, so an MCP client (e.g. Claude Code) cannot list, author, edit, install, uninstall, or delete composer definitions as tools. This blocks an AI-guided customization workflow.

## Goal

1. Ship a stdio MCP server (`insight-flow mcp`) exposing the composer registry as ~12 tools.
2. Keep it a thin facade: reuse the exact `core/storage` + `agents` + dashboard `custom-defs` + install/uninstall functions — no logic duplication.
3. Preserve all existing safety: eject-on-edit-builtin, locked-module/default-flow refusal, revision concurrency (N111), reference-safe uninstall/delete, `.mcp.json` undo snapshots (N172).
4. Ship a built-in `mcp-server` module that installs the composer MCP into a project's `.mcp.json` (dogfooded self-install).
5. Document the feature: a dedicated top-level Docusaurus section + all READMEs.

## Scope

### In scope

- **New `packages/taskflow/src/mcp/` folder** — MCP server entry + tool registration. Imports existing functions; defines no new domain logic.
- **`@modelcontextprotocol/sdk`** added to `packages/taskflow/package.json` (first server-side MCP dependency).
- **New `insight-flow mcp` CLI command** — `src/cli/cli.ts` dispatch + `src/cli/commands/mcp.ts`; starts the stdio server. No-master-required class. Add to `printHelp()`. **stdio only — no config port prop.**
- **Tool surface (~12, hybrid granularity):**
  - `list(kind)`, `get(kind, id)` — `kind` ∈ `module|agent|flow`; return built-in **and** custom, tagged by `source` / `locked` / installed state.
  - `create_module(def)`, `create_agent(def)`, `create_flow(def)` — per-kind, kind-specific schemas.
  - `update_module(id, def)`, `update_agent(id, def)`, `update_flow(id, def)` — full dashboard parity: built-in → eject/override (custom shadow, `ejected:true`); locked modules (`security`, `enforcement`, `protocol`, and all `status-transition`/`handover` by kind) and the immutable `default` flow → **refuse**; revision-aware (`x-revision`, N111).
  - `install(kind, id)`, `uninstall(kind, id)` — uninstall reference-safe (manifest-scoped, 409 on referenced).
  - `delete(kind, id)` — removes the custom def itself, reference-safe (409 if referenced); distinct from `uninstall`.
- **Built-in install module** — new `mcp-server`-kind module under `src/agents/modules/`, suggested id `mcp-composer` (normal ejectable built-in, **not** locked), `config: { "command": "insight-flow", "args": ["mcp"] }`. Installing it writes the `composer` entry into the project's `.mcp.json`.
- **Docs (part of this task):**
  - New **dedicated top-level section** in `website/docs/` for the composer MCP — setup (`.mcp.json` registration), full tool reference; add `_category_.json`, cross-link from `concepts/{modules,agents,flows}.md`. "Next" version only (do not touch `versioned_docs/version-2.0/`).
  - Document in **all READMEs**: `packages/taskflow/README.md` (npm funnel) and the repo-root `README.md` — intro the MCP and link to docs.

### Out of scope

- The composer authoring flow (separate follow-up task).
- The documentation agent in the default flow (separate follow-up task).
- HTTP/SSE transport, auth, and any config port prop.
- Editing the shipped `default.json` flow.

## Implementation plan

1. **Add the SDK + scaffold `src/mcp/`** — install `@modelcontextprotocol/sdk`; create `src/mcp/server.ts` wiring a stdio `Server`/transport and a `registerTools()` that the CLI command invokes.
2. **Map tools to existing logic** — locate the reused functions (dashboard `custom-defs.ts` create/update/delete handlers, `agents` registry/compose/install/uninstall, `core/storage`). Each tool handler calls these and translates errors (409 referenced, locked-refuse, revision-conflict) into MCP tool errors. No new domain logic.
3. **Tool schemas** — kind-parameterized `list`/`get`/`install`/`uninstall`/`delete`; per-kind `create_*`/`update_*` mirroring the Zod schemas for module/agent/flow defs. Return `source`/`locked`/installed flags on reads.
4. **Wire the CLI command** — add `mcp` to `src/cli/cli.ts` (no-master class) and `src/cli/commands/mcp.ts`; document in `printHelp()`.
5. **Ship the `mcp-composer` built-in module** — add the JSON under `src/agents/modules/`; verify it appears in `list("module")` and that `install("module","mcp-composer")` writes the `composer` entry into `.mcp.json` (and undo snapshot per N172).
6. **Docs** — new top-level Docusaurus section + `_category_.json`, cross-links; update both READMEs.
7. **Verify safety paths** — confirm edit-builtin ejects, locked/default refuse, uninstall/delete are reference-safe, install/uninstall snapshot `.mcp.json`.

## Verification

- `pnpm --dir packages/taskflow run build` succeeds; `npx tsc --noEmit` clean.
- `insight-flow mcp` starts a stdio server; an MCP client (Claude Code via `.mcp.json` `{ "composer": { "command": "insight-flow", "args": ["mcp"] } }`) lists the ~12 tools.
- `list("module")` shows built-in + custom with correct `source`/`locked` flags; `create_module` writes a `custom:` def; `update_module` on a built-in produces an eject override; `update` on a locked module and on the `default` flow refuse.
- `install("module","mcp-composer")` adds the `composer` server to `.mcp.json`; `uninstall` removes it and is reference-safe; `delete` 409s when referenced.
- Docs build (`pnpm --dir website build`) includes the new section; both READMEs link to it.

## Notes

- Strategist analysis + decision trail: see `ANALYSIS.md` in this folder.
- Thin-facade constraint is load-bearing — reuse `custom-defs.ts` / `agents` / install paths; do not re-implement validation, locking, or emission.
- Related: N111 (revision concurrency), N119/N156 (locked modules), N147 (edge handover), N172 (`.mcp.json` undo snapshots), N173 (flow identity), N180 (README rework), N181–N187 (docs site).
- First server-side MCP dependency for the project, which has otherwise been disciplined about runtime deps (native http, no frameworks).
