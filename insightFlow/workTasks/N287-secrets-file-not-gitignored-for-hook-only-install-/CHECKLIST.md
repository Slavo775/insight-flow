# N287 — Secrets file not gitignored for hook-only install inputs (N273 regression) — Checklist

## Done criteria

- [x] `writeSecrets` adds `.insight-flow/secrets.local.json` to `.gitignore` before writing, whenever it persists values
- [x] `writeSecrets` with no values still writes nothing (no `.gitignore` change)
- [x] `.mcp.json` is still gitignored only via `ensureMcpGitignored` (MCP-only trigger unchanged)
- [x] Regression test: hook-only style `writeSecrets` → `.gitignore` lists the secrets file, not `.mcp.json`; no duplicate on a second call
- [x] `guides/install-engine.md` no longer tells users to gitignore the secrets file by hand
- [x] N270 release notes + Notes updated (regression marked fixed by N287)

## Quality gates

- [x] `pnpm --dir packages/taskflow run typecheck` passes
- [x] `pnpm --dir packages/taskflow run lint` passes (0 errors)
- [x] `pnpm --dir packages/taskflow test` passes
- [x] `pnpm --dir website build` — no broken links

## Verification

- [x] New test fails without the `writeSecrets` change and passes with it
