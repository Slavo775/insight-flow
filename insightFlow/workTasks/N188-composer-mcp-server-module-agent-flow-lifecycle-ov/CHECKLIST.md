# N188 — composer MCP server — module/agent/flow lifecycle over MCP (stdio) — Checklist

## Done criteria

- [ ] `@modelcontextprotocol/sdk` added to `packages/taskflow/package.json`
- [ ] `src/mcp/` server boots over stdio via `insight-flow mcp` (command registered + in `printHelp()`)
- [ ] `list(kind)` / `get(kind,id)` return built-in + custom, tagged with `source` / `locked` / installed flags
- [ ] `create_module` / `create_agent` / `create_flow` write `custom:` defs
- [ ] `update_*` ejects built-ins, refuses locked modules + the `default` flow, honors `x-revision` (N111)
- [ ] `install(kind,id)` / `uninstall(kind,id)` work; uninstall is reference-safe; `.mcp.json` undo snapshot preserved (N172)
- [ ] `delete(kind,id)` removes the custom def, 409 when referenced
- [ ] Tool handlers reuse existing `custom-defs` / `agents` / `core/storage` functions — no duplicated domain logic
- [ ] Built-in `mcp-composer` `mcp-server` module shipped; `install` writes the `composer` entry to `.mcp.json`
- [ ] New dedicated top-level Docusaurus section ("Next" only) with `_category_.json` + cross-links from `concepts/*`
- [ ] Both READMEs (`packages/taskflow/README.md` + repo-root) introduce the MCP and link to docs

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir website build` passes (new section renders)
- [ ] Related tests pass / no regressions in composer (custom-defs, install/uninstall)

## Verification

- [ ] Register the server in a project `.mcp.json` and confirm an MCP client lists the ~12 tools
- [ ] Edit a built-in via `update_*` → confirm an eject override is produced; locked + `default` flow refuse
- [ ] `install` then `uninstall` `mcp-composer` → `.mcp.json` updated and restored; `delete` 409s when referenced
