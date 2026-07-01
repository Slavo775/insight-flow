# N197 — Authoring flow ↔ composer MCP wiring (mcp-composer install + stdio usage) — Checklist

## Done criteria

- [ ] `mcp-composer` added to the authoring flow's `install` list (N194) — installing the flow registers the `composer` server in `.mcp.json`
- [ ] Shared guidance section composed into the authoring agents: composer tools come from the `composer` MCP (stdio); "tools missing → install `mcp-composer`" recovery; never assume/start a long-running server
- [ ] Docs note the stdio lifecycle (harness-managed; no start/stop/recover) + the authoring-flow ↔ MCP relationship
- [ ] No HTTP/SSE transport or agent-managed server lifecycle introduced

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] `pnpm --dir website build` passes (docs)

## Verification

- [ ] Installing the authoring flow writes the `composer` entry to `.mcp.json`
- [ ] The authoring agents' composed prompts include the composer-MCP/stdio guidance
