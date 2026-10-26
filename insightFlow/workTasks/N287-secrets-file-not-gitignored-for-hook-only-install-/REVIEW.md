# N287 — Secrets file not gitignored for hook-only install inputs (N273 regression) — Review

**Reviewer:** Task Reviewer (ai) — with `review-correctness` + `review-security`
**Date:** 2026-10-26
**PR:** #175 (commit `9427010` on `chore/N271-audit-fixes`, not pushed yet)
**Verdict:** approved

## Summary

`writeSecrets` (`packages/taskflow/src/core/secrets.ts:36`) now calls `ensureGitignored(projectRoot, [SECRETS_PATH])` after its empty-values return and before reading or writing the store. Its only caller is the dashboard install handler (`dashboard/server/index.ts:1311`); the CLI and the composer MCP only read stored secrets. So every save now gitignores `.insight-flow/secrets.local.json`, including hook-only inputs, and `.mcp.json` stays MCP-only. The order fails closed: if `.gitignore` can't be written, no secret is saved and the handler turns the error into a scrubbed `persistWarning` (install still 200). MCP behaviour is the same as 2.12.0 or stricter. Low risk, small diff.

## Checklist verification

- [x] `writeSecrets` adds the secrets line to `.gitignore` before writing, whenever it persists values — pass (`secrets.ts:36`)
- [x] No values → nothing written, no `.gitignore` — pass (early return, `secrets.ts:33`; test `inputs.test.mjs:72-73`)
- [x] `.mcp.json` still gitignored only via `ensureMcpGitignored` — pass (test asserts no `.mcp.json` line)
- [x] Regression test: secrets line once after two calls, no `.mcp.json` — pass (`inputs.test.mjs:70-81`); fails without the fix (verified by the implementer: 14 pass / 1 fail)
- [x] `guides/install-engine.md` no longer tells users to gitignore the store by hand — pass (`:51-56`)
- [x] N270 release notes + Notes updated — pass (`TASK.md:108`, `:121`)
- [x] Gates: typecheck clean, lint 0 errors (2 old warnings in `FlowEditor.tsx`), 431/431 tests, docs build clean — pass

## Non-blocking

1. **Already-tracked store gets no warning** (`secrets.ts:36`) — `.gitignore` can't help once the file is tracked; `.mcp.json` has a `git ls-files` check, the store doesn't. Fix: share a `trackedWarning(projectRoot, rel)` helper and return it from `writeSecrets`. Small real exposure (the un-ignored window existed only on unreleased builds since N273 review #6).
2. **Temp file not cleaned up on a failed rename** (`secrets.ts:57-59`) — `secrets.local.json.tmp-*` holds all keys and isn't matched by the ignore line. Fix: `rmSync(tmp, { force: true })` in a catch around `renameSync`; optionally ignore `.insight-flow/secrets.local.json*`. Existed since N273's atomic write.
3. **Symlinked `.gitignore` is followed** (`secrets.ts:70-77`) — git ≥ 2.32 ignores an in-tree symlinked `.gitignore`, so the rule may silently not apply. Fix: `lstatSync(...).isSymbolicLink()` → throw, like `master/server.ts:145-154`.
4. **Hand-written / stored-only secrets file is never gitignored** (`flow-install.ts:310-316`, `index.ts:1248`) — docs tell users to create the file by hand (`authoring/walkthrough.md:123`); a CLI/MCP install or a re-install with nothing new typed never calls `writeSecrets`. Same as 2.12.0. Fix: `ensureGitignored(projectRoot, [SECRETS_PATH])` when the store is non-empty in `resolveInstallValues` and the dashboard handler.
5. **Warning text on a failed gitignore write** (`index.ts:1312-1313`) is a raw fs error and doesn't say the secrets weren't saved. Matters once the modal shows warnings.
6. **Block header** (`secrets.ts:76`) says "local secrets + substituted .mcp.json" even when only the secrets line is added. Cosmetic.
7. **Missing `projectRoot`** — `writeSecrets` now throws ENOENT before `mkdirSync` would have created the folder. Public-API edge only; no `src/` caller passes a missing root.
8. **Test style** (`inputs.test.mjs:73`) — `assert.throws(() => readFileSync(...))` passes on any error; `assert.equal(existsSync(...), false)` says it more clearly.

## Security & edge cases

Out of scope for N287 — already present before it, **not** regressions, but real secret leaks that need their own tasks:

- **A (HIGH) — hook values are committed via `.claude/settings.json`.** `agents/emit.ts:548` substitutes `${VAR}` into the hook command and `emit.ts:241-272` writes it into `.claude/settings.json`, the shared committed file (`inputs.test.mjs:169-186` asserts it). So in exactly the hook-only case, the plain value still lands in a tracked file. Fix options: write such hooks to `.claude/settings.local.json` (gitignored), or leave `${VAR}` for the shell to read from env/the store at run time. Until then, `install-engine.md` §3 should say hook values end up in `.claude/settings.json`.
- **B (HIGH) — `.claude/taskflow-managed.json` holds real values and is never gitignored.** `emit.ts:277` stores the filled-in hook command; `emit.ts:195` snapshots the previous `.mcp.json` entry (with its key) on force-install; written at `emit.ts:589`. This bypasses the N273 `.mcp.json` gitignore. Fix: store a hash for hook matching; move snapshots under the gitignored `.insight-flow/`.
- **C (MEDIUM) — hook script bodies get input values.** `sub()` (`emit.ts:536-537`, used at `:549`) replaces `__KEY__` for every var, so a script containing `__MY_KEY__` gets the secret written into `.claude/hooks/<name>`. Fix: limit script substitution to reserved vars.
- `.cursor/hooks.json` is clean (static content, no substitution).

## Notes

- 2.12.0 reference: N271 `AUDIT.md` A15 — the dashboard path ran `writeSecrets` then `ensureGitignored(projectRoot)` when persisting new values.
- Follow-ups (ask the human before creating): A + B + C above (secret leaks via `.claude/`), non-blocking 1–4 (store hardening), and the dashboard modal showing `warning` (already noted in N270).
- Related: N270 (2.13.0 release), N273 (install hardening), N271 (audit).
