# N273 — Install trust boundary — MCP install confirm, include.ref guard, .mcp.json secrets, locked agent baseline — Checklist

## Done criteria

- [x] MCP `install` returns `{ needsConfirm, plan }` and writes nothing for hook / mcp-server targets unless `confirm: true` (A14)
- [x] Tool description states that `install` writes shell hooks that run in future sessions (A14)
- [x] `include.ref` only accepts a safe filename; all built-in includes still pass (A14)
- [x] `executeInstall` gitignores `.mcp.json` when secrets are substituted and warns when it is git-tracked — covers the CLI / init / MCP paths; the dashboard path already gitignored it (A15)
- [x] This repo's tracked `.mcp.json` was checked for secrets and the result was reported to the human
- [x] MCP `install` reports `missingInputs` instead of writing literal `${VAR}` (A53a)
- [x] MCP `delete` of an installed target is refused; `uninstall` of a never-installed target says `installed: false` (A53b, A53c)
- [x] `create_*` descriptions no longer mention ejecting built-ins (A53d)
- [x] An override of a built-in agent that drops any of the built-in's `LOCKED_MODULE_IDS` fails to load, with the file named (A18). NOTE: scoped to overrides of built-ins — a pure `custom:` agent is not forced to carry the trio (that is the emit-time concern of N275/A80), so existing custom agents are unaffected
- [x] `/api/install` persists values only after a successful apply; `secrets.local.json` is written atomically with mode 0600; a corrupt file is never merged onto `{}` (A36)

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow run lint` passes
- [x] `pnpm --dir packages/taskflow test` passes
- [x] No regressions in affected area (`emit`, `install-targets`, `user-registry`, `custom-defs-api`, `compose`, `flow-chains` green)

## Verification

- [x] MCP tests over `StdioClientTransport` cover the confirm gate, missing inputs, delete of an installed target and uninstall of a never-installed target
- [x] A test proves an agent override that drops `security` is rejected
- [x] A test proves the secrets file mode is 0600 and a corrupt file keeps the other secrets
