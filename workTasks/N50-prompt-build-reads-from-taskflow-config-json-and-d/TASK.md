# N50 — prompt-build reads from taskflow.config.json and drops taskflow.prompt.json

**Type:** rework
**Priority:** medium
**Created:** 2026-05-26

## Problem

`prompt-build` reads from a separate `taskflow.prompt.json` and generates a static enforcement block that ignores what the user has actually configured in `taskflow.config.json`. Git permissions (`agents.git.permissions`) and agent extensions (`agents.extend`) set in the main config are never reflected in `AGENT_ENFORCEMENT.md`, so agents receive rules that may contradict the project's real config.

## Goal

1. `prompt-build` reads exclusively from `taskflow.config.json` — `taskflow.prompt.json` is dropped.
2. The generated GIT RULE block reflects actual `agents.git.permissions` values (allowed vs denied operations listed explicitly).
3. `remoteOps: "deny"` shorthand produces a clear "all remote operations are NOT permitted" statement.
4. `agents.extend` entries per agent are injected into each role file's enforcement section during `--apply`.
5. No behaviour change when `agents.git` or `agents.extend` are absent (graceful fallback to current generic rules).

## Scope

### In scope

- `packages/taskflow/src/commands/prompt-build.ts` — rewrite `loadConfig` and `buildEnforcementBlock` to read from `taskflow.config.json` via the existing `resolveConfig()` helper; remove `PromptConfig` interface and `taskflow.prompt.json` logic.
- `packages/taskflow/src/types.ts` — verify `AgentsConfig`, `AgentGitPermissions` types cover all needed fields (no schema changes expected).
- `packages/taskflow/src/cli.ts` — pass `config` into `cmdPromptBuild` instead of raw `opts` so it has access to the resolved config.
- `AGENT_ENFORCEMENT.md` at repo root — regenerate as part of verification.

### Out of scope

- `taskflow.config.json` schema changes.
- Role file content beyond the enforcement section.
- `init` wiring (covered by N51).

## Implementation plan

1. **Update `cmdPromptBuild` signature** — change `packages/taskflow/src/commands/prompt-build.ts` to accept `config: TaskflowConfig` as first arg; update call site in `cli.ts` to pass `resolveConfig()`.
2. **Remove `PromptConfig` / `taskflow.prompt.json`** — delete the `PromptConfig` interface, `loadConfig`, `DEFAULTS`, and all references to `opts.config` / `taskflow.prompt.json`.
3. **Rewrite `buildEnforcementBlock`** — read `config.agents?.git?.permissions` to produce an explicit allow/deny list in the GIT RULE section:
   - Denied ops listed as "X is NOT permitted".
   - `remoteOps: "deny"` → emit "All remote operations (push, createPR, deleteBranchRemote) are NOT permitted."
   - Fall back to generic wording when `agents.git` is absent.
4. **Inject `agents.extend` into role files** — during `--apply`, for each agent in `agents.extend`, append its rules inside the `<!-- taskflow:extensions:start/end -->` markers in the corresponding role file under `config.rolesDir` (same logic already used in `init.ts:applyAgentExtensions` — extract to a shared helper).
5. **Update help text** — remove `--config` flag reference from `cli.ts` help string and `prompt-build` preview output.
6. **Regenerate `AGENT_ENFORCEMENT.md`** — run `insight-flow prompt-build --apply` against this repo and commit the updated file.

## Verification

- `insight-flow prompt-build` (no flag) prints git permissions from the repo's own `taskflow.config.json`.
- `insight-flow prompt-build --apply` rewrites `AGENT_ENFORCEMENT.md` and shows no diff when re-run immediately after.
- With `agents.git.permissions.push: false` in config, the generated block contains "push is NOT permitted".
- With `remoteOps: "deny"`, block contains "All remote operations are NOT permitted."
- `pnpm --dir packages/taskflow run build` passes with no TypeScript errors.

## Notes

- `applyAgentExtensions` in `init/index.ts` already does the role-file patching for `agents.extend` — extract it to a shared utility in `packages/taskflow/src/agents.ts` (or similar) so both `init` and `prompt-build` call the same function.
- Related: N51 wires `init` to call `prompt-build --apply` so the enforcement block is always regenerated on init.
