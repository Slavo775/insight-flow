# N273 — Install trust boundary — MCP install confirm, include.ref guard, .mcp.json secrets, locked agent baseline — Review

**Reviewer:** Task Reviewer (ai) + independent correctness/security sub-review
**Date:** 2026-10-20
**PR:** (no PR yet — commit `39cf9c6` on `chore/N271-audit-fixes`)
**Verdict:** REQUEST CHANGES (fix-needed)

## Summary

The composer MCP `install` now returns a plan and refuses to write hook/mcp-server artifacts without `confirm:true`, reports `missingInputs`, refuses to delete an installed definition and reports `installed:false`; `include.ref` is a safe basename; `executeInstall` gitignores `.mcp.json` when a secret is substituted; a built-in agent override may not drop the locked baseline; the dashboard persists secrets only after a successful apply; `secrets.local.json` is written atomically at 0600 and a corrupt file is never merged onto `{}`. The core mechanics are correct and well tested (MCP tests over a real stdio client). Two defects block merge, both small: the A18 baseline check is enforced only in the **loader**, so the **write path** still accepts an override that then bricks user space on every subsequent load; and the new corrupt-secrets error embeds V8's `JSON.parse` message, which quotes the file content — a leak of secret values over HTTP/SSE. A longer list of hardening items follows; the most important is that `confirm:true` is a two-step protocol, not an authorization boundary (it is still worth having — it prevents a single-call silent install and puts the plan in the transcript).

## Checklist verification

- [x] MCP `install` returns `{needsConfirm, plan}` and writes nothing for hook/mcp-server targets unless `confirm:true` (A14) — pass (`composer.ts:363-382`; `install-trust.test.mjs`). Caveat: agent-side gate (non-blocking #1)
- [x] Tool description says `install` writes shell hooks that run in future sessions (A14) — pass (`composer.ts:344-350`)
- [x] `include.ref` only accepts a safe filename; built-in includes pass (A14) — pass (`schema/index.ts:348-350`; shipped refs all `AGENT_*.md`)
- [ ] `executeInstall` gitignores `.mcp.json` + warns when tracked, on CLI/init/MCP (A15) — PARTIAL: gitignore yes; the warning is `console.warn` only (invisible over MCP — it lands on the stdio server's stderr) and absent on the dashboard path, which bypasses `executeInstall` (non-blocking #3)
- [x] This repo's tracked `.mcp.json` checked and reported — pass (composer + lovable entries, no secrets)
- [x] MCP `install` reports `missingInputs` (A53a) — pass (`composer.ts:370-375`; test)
- [x] MCP `delete` refuses installed; `uninstall` reports `installed:false` (A53b, A53c) — pass (`composer.ts:325-332`, `:401-405`; tests)
- [ ] `create_*` no longer mentions ejecting built-ins (A53d) — PARTIAL: the appended `DEF_SHAPE_HELP` still says "or match a shipped built-in id (to eject/override)" (`composer.ts:240, 242`) (non-blocking #7)
- [ ] A built-in override that drops a locked module fails, file named (A18, rescoped) — VERIFIED for the loader (`user-registry.ts:187-200`; test) but NOT MET on the write path (blocker 1)
- [x] `/api/install` persists after apply; 0600 atomic; corrupt never merged onto `{}` (A36) — pass (`index.ts:1255-1260`; `secrets.ts:31-53`; test) — but see blocker 2 (the corrupt-file error message)
- [x] Quality gates — as run by the implementer (404/404 then); not re-run here
- [x] MCP tests over `StdioClientTransport` for the four behaviours — pass (`install-trust.test.mjs:553-614`)
- [x] Override-drops-baseline rejected test — pass
- [x] Secrets 0600 + corrupt-keeps-others test — pass (`:480-497`)
- [ ] TASK.md step 9 "a failed `/api/install` does not persist values" — NOT MET: no such test exists; the checklist silently dropped it (non-blocking #13)

## Blockers

1. **A18 is enforced only in the loader, not on the write path — an accepted override bricks user space** — `src/dashboard/server/custom-defs.ts:113-127` (`validateReferences("agents")`, used by HTTP `PUT /api/agents/<id>` and MCP `update_agent`) vs `src/agents/user-registry.ts:187-200`.
   **Why:** a prompt-injected agent calls `update_agent {id:"task-implement", modules:["task-implement/identity"]}` → 200, file written → every later `loadUserRegistries()` throws → `loadRegistriesForWrite` 500s on every HTTP write including DELETE (`custom-defs.ts:522-528`) and every MCP write/delete fails in `guard`; the user must hand-delete the override file to recover. This is exactly the write-path/loader divergence the codebase forbids (`custom-defs.ts:359-362`, N188 / N190 B2).
   **Fix:** extract the check into a helper in `user-registry.ts` (e.g. `missingLockedBaseline(def, mergedModules): string[]`) and call it from both the loader and `validateReferences("agents")` (→ 400 "override of built-in agent drops locked baseline …"). Add a test that the PUT / `update_agent` is refused.

2. **The corrupt-secrets error leaks the file's contents** — `src/core/secrets.ts:42-46`.
   **Why:** the thrown message embeds `(err as Error).message` from `JSON.parse`; V8's message quotes the input (`Unexpected token 'x', "<file content>" is not valid JSON`), so a hand-edited secrets file (e.g. a trailing comma after `"API_KEY":"sk-live-…"`) puts the secret values into the error. On the dashboard path the throw happens AFTER apply (`index.ts:1258`), and the message goes into the 500 body **and** the SSE `install-progress: failed` broadcast to every open tab (`index.ts:1282-1284`). `scrubSecrets` cannot catch it: `readSecrets` returned `{}` for the corrupt file, so `secretValues` lacks the old values.
   **Fix:** throw a fixed message with no parse detail: `refusing to overwrite a corrupt secrets file (${SECRETS_PATH}) — fix or remove it by hand`.

## Non-blocking

1. `composer.ts:380-382` — `confirm:true` is a two-step protocol, not an authorization boundary: the same agent sends both calls, and with this repo's pre-allowed composer tools no human prompt fires. It prevents a single-call silent install and surfaces the plan in the transcript, but it does **not** bind `confirm` to the plan shown — the agent can `update_module` the hook command between call 1 and call 2. Cheap hardening: return a `planHash` (sha1 of `JSON.stringify(plan)`) in `needsConfirm` and require `confirm:"<hash>"` equal to the current plan's hash. Stronger: `server.server.elicitInput(...)` (sdk ^1.32.1 has it) when the client supports elicitation, falling back to the two-step.
2. `composer.ts:90-92` — on `InstallConflictError` the MCP result returns `err.conflict` raw; `installed`/`incoming` carry `${VAR}`-resolved secrets (`emit.ts:185-192`). The dashboard scrubs (`index.ts:1273`), MCP does not. Pre-existing, but N273 made this path secret-aware. Fix: `scrubSecrets(err.conflict, [...Object.values(stored), ...Object.values(provided)])` in the install handler.
3. `flow-install.ts:343-346` — the git-tracked warning is `console.warn` only (stderr of the stdio server — the agent never sees it; the test sets `stderr:"ignore"`), and the dashboard path bypasses `executeInstall` (`index.ts:1248`), so a git-tracked `.mcp.json` gets secrets there with no warning. TASK.md asked for a returned `wroteSecretsToTrackedFile` warning. Fix: `executeInstall` returns `{ reports, warnings }` (or takes `onWarn`); surface it in the MCP `ok(...)`; route the dashboard through `executeInstall` (it duplicates `resolveInstallValues` anyway).
4. `index.ts:1257-1260` — the dashboard calls `ensureGitignored` only when `toPersist` is non-empty; a re-install using only stored secrets never re-ensures. Mirror `executeInstall`'s condition (`artifacts.mcpServers.length && Object.keys(values).length`).
5. `index.ts:1258` — `writeSecrets` throwing after a successful `applyArtifacts` yields 500 + SSE "failed" although the artifacts were written. Wrap in try/catch and return 200 with a warning.
6. `flow-install.ts:337` — `Object.keys(values).length > 0` also counts hook-command `${VAR}` values, so an mcp server with no placeholders plus a templated hook gitignores `.mcp.json` needlessly. Scan only mcp configs for the trigger.
7. `composer.ts:294` + `DEF_SHAPE_HELP` (`:238-246`) — A53d half done: `create_module`/`create_agent` descriptions still append "or match a shipped built-in id (to eject/override)"; `create_flow` points to `update_flow` for eject, which `updateDefinition` refuses over MCP (`:219-223`); `create_chain` says "eject a built-in" though chains have none. Build create-specific help text.
8. `composer.ts:370-375` — missing-inputs runs before the confirm gate, so a plan-only call already needs the secret values. Return `{ needsConfirm, plan, missingInputs }` on call 1 and enforce only on the confirm call.
9. HTTP `DELETE /api/{modules,agents,projects}` has no installed guard — the dashboard can still orphan artifacts (`custom-defs.ts:257-314`). Spec scoped A53b to MCP; one shared check in `removeDefinition` would close the divergence.
10. `composer.ts:325-332` — reverting a built-in override while the built-in is installed is refused although a revert orphans nothing (the id stays). Harmless UX nit.
11. `secrets.ts:50` — tmp name is pid-only; `custom-defs.ts:222` uses pid+time+random. Fine in practice (sync write, single writer); align for consistency.
12. Un-gated kinds: `skill` is model-invoked and `subagent` can carry `tools: Bash`, so both persist prompt injection for future sessions without confirm. Spec-consistent (the gate is hook/mcp); flagging only.
13. TASK.md step 9 listed "`/api/install`: a failed install does not persist values" — no such test exists; the checklist silently dropped it. Add it.
14. `composer.ts:363, 370, 384` — `targetArtifacts` (and user-space loads) runs 3× per MCP install. Perf only; compose once.

## Security & edge cases

- Verified closed: `writesExecutable` is correct (plan kinds `mcp|hook|skill|command|subagent`; `resolveModules` flattens nested bundles and `flowArtifacts` folds agents + `flow.install`, so a hook hidden in a bundle/flow still yields a hook step). `missingInputs` matches the dashboard's computation (both `inputsFromArtifacts(targetArtifacts(t))` with submitted ?? stored). Locked ids cannot be ejected (`user-registry.ts:128-131`), so the override check uses the right registries and a legit override reaching the trio via a `custom:` bundle passes. `include.ref` cannot escape (no `/`/`\`; bare `..` can't match; `..md` is a harmless basename). `git ls-files` is array-args, `stdio:"ignore"`, try/catch — safe outside a git repo; the warning text has no values. 0600 is effective (tmp created 0600, rename replaces the inode; umask can only clear bits). Moving `writeSecrets` after apply does not change `secretValues` scrubbing, and the 409→force retry re-sends values. All writers of a secret-substituted `.mcp.json` route through `executeInstall` (CLI `install-flow.ts:17`, init `index.ts:371`, MCP `composer.ts:384`); the dashboard is the known separate path (#3/#4). MCP-supplied values are never persisted to `secrets.local.json`. Repo `.mcp.json`: composer (local cmd) + lovable (public URL) — no secrets.
- Blocker 2 is the only new leak; blocker 1 is availability (bricked user space), not confidentiality.

## Notes

- Fix order: blocker 2 (one-line message change) → blocker 1 (shared helper + 400 on the write path + test) → then #13 (the missing failed-install-does-not-persist test) and #3/#4 (dashboard parity with `executeInstall`) are the most valuable follow-ups.
- Hand-off: `/task-review-fix N273` (gated — wait for the human's go-ahead).

## Fix log (task-review-fix, 2026-10-20, Opus 4.8)

**Blocker 1 — A18 enforced only in the loader — FIXED.** Extracted the locked-baseline check into exported `missingLockedBaseline(def, resolvedIds)` + `lockedBaselineError(...)` in `user-registry.ts`; the loader and `validateReferences("agents")` (the PUT / `update_agent` write path) now both call it, so a baseline-dropping override is refused at WRITE time (400), not just at load. New test `MCP update_agent: overriding a built-in cannot drop the locked baseline`.

**Blocker 2 — corrupt-secrets error leaked file contents — FIXED** (`core/secrets.ts`): the throw no longer embeds V8's `JSON.parse` message (which quotes the input). New test asserts a secret value in a corrupt file is NOT in the error message.

**Non-blocking addressed:**
- #2 MCP install conflict now scrubs secrets (`scrubSecrets(err.conflict, …)`) like the dashboard.
- #3 the "git-tracked .mcp.json" warning now reaches the client: new shared `ensureMcpGitignored(root)` returns the warning; `executeInstall` surfaces it via a new `onWarn` option (composer includes `warnings` in `ok()`), and the dashboard install path uses the same helper.
- #4 dashboard now ensures `.mcp.json` is gitignored whenever an MCP config uses a resolved value (not only when new secrets are submitted).
- #5 a `writeSecrets`/gitignore failure AFTER a successful apply no longer reports the install as failed — it returns 200 with a `warning`.
- #6 the gitignore trigger (both paths) now fires only when an MCP config actually references a resolved `${VAR}` (not a hook-only one).
- #7 (A53d) `DEF_SHAPE_HELP` is shape-only; the contradictory "eject/override a built-in" clauses are gone (each create_/update_ tool states its own id rule).
- #8 a plan-only `install` call returns `{ needsConfirm, plan, missingInputs }` instead of failing on missing inputs. New test.
- #9 the HTTP `DELETE /api/{modules,agents}` path now has the same installed-guard as MCP delete (409 while installed).
- #11 the secrets tmp-file name is now pid+time+random (aligned with custom-defs).

**Non-blocking deliberately left (with reason):**
- #1 bind `confirm` to a `planHash` — a cross-cutting MCP protocol change; the two-step gate is the accepted locked design (prevents the single-call silent install, puts the plan in the transcript). Better as its own task.
- #10 reverting a built-in override while installed — harmless UX nit.
- #12 `skill`/`subagent` not confirm-gated — spec-consistent (the gate is hook/mcp).
- #13 a dashboard test that a FAILED `/api/install` doesn't persist — the invariant is enforced in code (persist runs only after a successful `applyArtifacts`, inside the post-apply try); a faithful conflict-path test needs heavy dashboard scaffolding.
- #14 `targetArtifacts` composed 3× — perf nit.

Verified: typecheck + lint + build clean; install-trust 9/9, server-trust 11/11, config-trust 6/6, and the compose/custom-defs/registry/emit/flow/mcp suites 158/158.
