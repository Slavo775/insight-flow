# N273 — Install trust boundary — MCP install confirm, include.ref guard, .mcp.json secrets, locked agent baseline — Checklist

## Done criteria

- [ ] MCP `install` returns `{ needsConfirm, plan }` and writes nothing for hook / mcp-server targets unless `confirm: true` (A14)
- [ ] Tool description states that `install` writes shell hooks that run in future sessions (A14)
- [ ] `include.ref` only accepts a safe filename; all built-in includes still pass (A14)
- [ ] `executeInstall` gitignores `.mcp.json` when secrets are substituted and warns when it is git-tracked, on every path: CLI, init, MCP and dashboard (A15)
- [ ] This repo's tracked `.mcp.json` was checked for secrets and the result was reported to the human
- [ ] MCP `install` reports `missingInputs` instead of writing literal `${VAR}` (A53a)
- [ ] MCP `delete` of an installed target is refused; `uninstall` of a never-installed target says `installed: false` (A53b, A53c)
- [ ] `create_*` descriptions no longer mention ejecting built-ins (A53d)
- [ ] An agent override or custom agent that misses any `LOCKED_MODULE_IDS` fails to load, with the file named (A18)
- [ ] `/api/install` persists values only after a successful apply; `secrets.local.json` is written atomically with mode 0600; a corrupt file is never merged onto `{}` (A36)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`emit`, `install-targets`, `user-registry`, `custom-defs-api`, `compose`, `flow-chains` green)

## Verification

- [ ] MCP tests over `StdioClientTransport` cover the confirm gate, missing inputs, delete of an installed target and uninstall of a never-installed target
- [ ] A test proves an agent override that drops `security` is rejected
- [ ] A test proves the secrets file mode is 0600 and a corrupt file keeps the other secrets
