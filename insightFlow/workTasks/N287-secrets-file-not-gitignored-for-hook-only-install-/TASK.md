# N287 — Secrets file not gitignored for hook-only install inputs (N273 regression)

**Type:** fix
**Priority:** high
**Created:** 2026-10-26

## Problem

- In 2.12.0 the dashboard install always ran `writeSecrets` and then `ensureGitignored`, so `.insight-flow/secrets.local.json` was always gitignored once it held values.
- Since N273 (review #6) the dashboard install calls `ensureMcpGitignored` only when an MCP server config uses a filled value (`packages/taskflow/src/dashboard/server/index.ts` ~l.1304-1311). A `${VAR}` input used only in a hook is still saved by `writeSecrets`, but the secrets file is never gitignored — a `git add -A` can commit real secrets.
- Found during the 2.13.0 release check (N270, re-check 6). Only custom modules with hook-only `inputs` are affected; no built-in module has `inputs`.

## Goal

1. Whenever `writeSecrets` persists values, `.insight-flow/secrets.local.json` is listed in the project's `.gitignore` — for every caller, not just the dashboard.
2. The `.mcp.json` gitignore + "already tracked" warning stays MCP-only (N273 review #6 behaviour unchanged).
3. A regression test fails if a hook-only install input leaves the secrets file un-ignored.
4. Docs and the N270 release notes no longer describe the manual workaround.

## Scope

### In scope

- `packages/taskflow/src/core/secrets.ts` — `writeSecrets` gitignores `SECRETS_PATH` itself.
- `packages/taskflow/test/inputs.test.mjs` (or the closest existing secrets test) — regression test.
- `website/docs/guides/install-engine.md` — drop "If your values are used only in hook commands, this step does not run — add the secrets file to `.gitignore` yourself"; say the secrets file is always gitignored when values are saved.
- N270 `TASK.md` — release notes ("Install can edit `.gitignore`" bullet) and the Notes entry for this regression.

### Out of scope

- Showing the server's `warning` in the dashboard install modal (separate follow-up).
- The `mcpUsesValue` trigger for `.mcp.json` — keep it as is.
- Any other install-path change.

## Implementation plan

1. **Root-cause fix in the shared function.** In `writeSecrets` (`core/secrets.ts`), after the early `return` for empty values, call `ensureGitignored(projectRoot, [SECRETS_PATH])` before writing the file (so the ignore rule exists before the secret lands on disk). Every current and future caller is covered.
2. **Leave `ensureMcpGitignored` as is.** It still adds both default patterns + checks whether `.mcp.json` is tracked; the dashboard keeps calling it only when an MCP config uses a value.
3. **Regression test.** In `test/inputs.test.mjs`: `writeSecrets(dir, { TOKEN: "x" })` in a fresh dir with no `.gitignore` → `.gitignore` lists `.insight-flow/secrets.local.json` and does **not** list `.mcp.json`. A second call adds no duplicate line. Check the existing `writeSecrets` merge test still passes.
4. **Docs.** Update the `guides/install-engine.md` bullet (see In scope).
5. **Release notes.** Update the N270 "Install can edit `.gitignore`" bullet: the secrets file is gitignored whenever values are saved; `.mcp.json` only when an MCP config uses a value. Mark the N270 Notes regression entry as fixed by N287.

## Verification

- `pnpm --dir packages/taskflow run typecheck`, `run lint`, `test` all pass.
- New test fails on the current code (revert step 1 locally to confirm) and passes with the fix.
- `pnpm --dir website build` — no broken links.

## Notes

- Regression introduced by N273 (`4ca6c3c` / `39cf9c6`, review #6) in the 2.13.0 range; 2.12.0 code: `writeSecrets(...)` then `ensureGitignored(projectRoot)` in the dashboard install handler.
- Ships with 2.13.0: commit on `chore/N271-audit-fixes` (PR #175), no new branch — per the human's instruction.
- Related: N270 (release), N273 (install hardening), N271 (audit).
