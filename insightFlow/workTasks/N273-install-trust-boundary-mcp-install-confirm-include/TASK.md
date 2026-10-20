# N273 — Install trust boundary — MCP install confirm, include.ref guard, .mcp.json secrets, locked agent baseline

**Type:** fix
**Priority:** high
**Created:** 2026-10-19

## Problem

The install path turns definitions into executable artifacts (hook commands, 0755 hook scripts, MCP servers) with no human gate when called over the composer MCP. This repo's `.claude/settings.local.json` pre-allows every composer tool, so a prompt-injected agent gets zero prompts. `executeInstall` also copies stored API keys into `.mcp.json` in plain text, and only the dashboard path adds `.gitignore` protection; this repo's `.mcp.json` is git-tracked. A repo-shipped agent override can drop the locked security modules. The MCP tools also report misleading results. Source: `N271/AUDIT.md` **A14, A15, A18, A36, A53**.

## Goal

1. Composer MCP `install` writes nothing that contains a hook or MCP server unless the caller passes `confirm: true` after receiving the plan.
2. `include.ref` can only name a safe file.
3. Stored secrets never land silently in an un-ignored or git-tracked `.mcp.json`.
4. No agent, built-in override or custom, can drop the locked baseline modules.
5. `install`, `uninstall` and `delete` over MCP report truthful results, and secrets are persisted safely.

## Scope

### In scope

- `packages/taskflow/src/mcp/composer.ts` — `install` (~:293-310), `uninstall` (~:312-325), `delete` (~:277-291), tool descriptions (`DEF_SHAPE_HELP` ~:207-215, :259).
- `packages/taskflow/src/agents/flow-install.ts` — `executeInstall`, `resolveInstallValues` (~:261-338).
- `packages/taskflow/src/agents/emit.ts` — mcp `${VAR}` substitution (~:465-467, :553-555).
- `packages/taskflow/src/core/inputs.ts` — `requiredInputs`.
- `packages/taskflow/src/core/secrets.ts` — write and read.
- `packages/taskflow/src/core/schema/index.ts` — `include.ref` (:348).
- `packages/taskflow/src/agents/user-registry.ts` — agent load (~:170-174).
- `packages/taskflow/src/dashboard/server/index.ts` — `/api/install` secret persistence order (~:1092-1104).
- Tests.

### Out of scope

- CSRF / Host gates on the dashboard → N272.
- Hook script content and quoting → N280.
- Unmanaged-file conflicts, atomic `applyArtifacts`, built-in vs `custom:` file collision → N281.
- Rewriting git history if `.mcp.json` already contains a secret. Report it to the human instead.

## Implementation plan

1. **Confirm gate on MCP install (A14).** `install` first computes the plan: targets, files, hook commands, MCP server names and commands. If the plan contains any hook or mcp-server artifact and `confirm !== true`, return `{ needsConfirm: true, plan }` and write nothing. Update the tool description to say it writes shell hooks that run in future Claude sessions. Leave the dashboard path unchanged (it already shows InstallModal).
2. **Safe `include.ref` (A14).** Change `schema/index.ts:348` from `z.string().min(1)` to a safe-filename regex with no path separators or `..` (e.g. `^[A-Za-z0-9_.-]+\.md$`). Confirm every built-in include still passes (`compose.test.mjs`).
3. **Secrets into `.mcp.json` (A15).** In `executeInstall`, when any `${VAR}` was substituted from stored secrets:
   - call `ensureGitignored(projectRoot)`;
   - if `.mcp.json` is git-tracked (`git ls-files --error-unmatch`, best effort), return a `wroteSecretsToTrackedFile` warning.
   Also consider leaving `${VAR}` unresolved and using Claude Code's native env expansion; pick one and document the choice in the PR. Check this repo's tracked `.mcp.json` for real secrets now and tell the human the result.
4. **Missing inputs (A53a).** `install` computes `requiredInputs(target)` minus stored secret keys. If the result is non-empty, return an error `{ missingInputs }`, or accept a `values` input like the HTTP route does.
5. **Truthful delete / uninstall (A53b, A53c).** `delete` of an installed target (`installedBuckets(root).has(...)`) → error "installed — uninstall first". `uninstall` of a target that was never installed → `{ ok: true, installed: false }`.
6. **Tool descriptions (A53d).** Remove the "eject a built-in" clause from the `create_*` descriptions; keep it on `update_*`.
7. **Locked baseline (A18).** In `loadUserRegistries`, reject any agent (override or custom) whose resolved modules miss any of `LOCKED_MODULE_IDS`. The error must name the file.
8. **`/api/install` and secrets file (A36).**
   - Persist the submitted `values` only after `applyArtifacts` succeeds.
   - `secrets.ts` writes via temp + rename with `mode: 0o600`, and chmods an existing file.
   - When `readSecrets` fails to parse, it throws or refuses to merge. It never merges onto `{}`.
9. **Tests.**
   - MCP over `StdioClientTransport` (pattern: `flow-chains.test.mjs` ~:351-361): confirm gate, missing inputs, delete of an installed target, uninstall of a never-installed target.
   - `user-registry`: an override that drops `security` is rejected.
   - `secrets`: mode `0600`, and a corrupt file does not wipe other secrets.
   - `/api/install`: a failed install does not persist values.

## Verification

- `pnpm --dir packages/taskflow test` is green, including the new tests.
- Manual (MCP): `create_module` of kind `hook`, then `install` without `confirm` → returns a plan and `.claude/settings.json` is unchanged; repeat with `confirm: true` → the hook is written.
- Manual: `insightFlow/agents/task-git.json` with `modules: ["task-git/identity"]` → load fails with a message naming the file.
- `stat -f %Lp .insight-flow/secrets.local.json` → `600` after an install that stores a value.

## Notes

- Detail and evidence: `N271/AUDIT.md` A14, A15, A18, A36, A53. Line numbers are from tree `30277e0`.
- Partial existing mitigation: a **new** `.mcp.json` server still needs Claude Code approval unless it is listed in `enabledMcpjsonServers`.
- Depends on **N272** (shares `dashboard/server/index.ts`; the dashboard gate is the other half of this boundary).
- Recommended run: `/task-analyze N273` → `/task-implement N273`.
