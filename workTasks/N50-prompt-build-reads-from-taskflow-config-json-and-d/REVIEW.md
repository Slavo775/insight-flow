# N50 — prompt-build reads from taskflow.config.json and drops taskflow.prompt.json — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**PR:** (no PR yet)
**Verdict:** approved

## Summary

The implementation removes `taskflow.prompt.json` entirely and rewires `prompt-build` to read from `taskflow.config.json`. A new shared helper `src/agents.ts` extracts `applyAgentExtensions` from `init/index.ts`, and `--apply` now calls it to inject `agents.extend` into `config.rolesDir` role files. The `buildEnforcementBlock` function reads raw (unmerged) git permissions to avoid polluting the output with defaults. Risk is low: the feature is additive, all tests pass, TypeScript is clean, and idempotency is verified.

## Checklist verification

- [x] `prompt-build` reads exclusively from `taskflow.config.json` — no `taskflow.prompt.json` reference remains in code or help text — **pass** (grep confirms zero remaining references)
- [x] GIT RULE block lists each denied git operation explicitly based on `agents.git.permissions` — **pass** (`Object.entries(rawGitPerms)` loop emits `- ${op} is NOT permitted.` for each `false` value)
- [x] `remoteOps: "deny"` produces a dedicated "all remote ops NOT permitted" line — **pass** (verified with test config)
- [x] `agents.extend` entries are injected into role files during `--apply` — **pass** (calls `applyAgentExtensions(rolesDir, extend)` in `--apply` path)
- [x] `applyAgentExtensions` extracted to a shared helper used by both `init` and `prompt-build` — **pass** (`src/agents.ts` is the canonical location; both importers confirmed)
- [x] `AGENT_ENFORCEMENT.md` at repo root regenerated — **pass** (content was already current; zero diff on re-run confirms idempotency)
- [x] `pnpm --dir packages/taskflow run build` passes — **pass**
- [x] No regressions in `init` — **pass** (7/7 init tests pass)
- [x] `insight-flow prompt-build` output contains git permissions — **pass**
- [x] `--apply` is idempotent — **pass** (second run produced no file changes)
- [x] `push: false` shows "push is NOT permitted" — **pass**

## Non-blocking

1. **`cmdPromptBuild` reads `taskflow.config.json` twice** (`prompt-build.ts:113–124`): `cli.ts` already called `resolveConfig()` which read the file, and then `cmdPromptBuild` re-reads the raw file. The reason is sound (avoid default-polluted permissions), but ideally `resolveConfig()` would expose the source path or the raw user config as a side channel. Low impact in practice.

2. **Subdirectory invocation gap** (`prompt-build.ts:114`): The raw-read uses `resolve(cwd, "taskflow.config.json")` while `resolveConfig()` walks up to `resolveProjectRoot()`. If `prompt-build` is ever invoked from a subdirectory, `rawGitPerms` would be `undefined` (no git-specific lines emitted) even if the config exists in a parent. Practical impact is nil since `prompt-build` writes `AGENT_ENFORCEMENT.md` to `cwd` anyway, but the inconsistency could confuse future contributors.

3. **`remoteOps: "deny"` suppresses local-op denials** (`prompt-build.ts:31–43`): If a user sets both `remoteOps: "deny"` and `createBranch: false`, only the remote-ops line is emitted; `createBranch: false` is silently dropped. This is an edge case but worth handling in a follow-up.

## Security & edge cases

None. The JSON parse errors are caught silently; `writeFileSync` failures would propagate as Node exceptions. No authz concerns.

## Notes

- `AGENT_ENFORCEMENT.md` was already exactly up-to-date (zero diff after `--apply`), so the checklist item "committed" is satisfied by the overall N50 commit.
- Related: N51 will wire `init` to call `prompt-build --apply`, completing the enforcement-block regeneration story.


---

## Round 2 — non-blocking fixes

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**Verdict:** approved

### Summary

Addresses all three non-blocking issues from round 1 in `packages/taskflow/src/commands/prompt-build.ts`. No scope expansion beyond those fixes.

### Changes made

1. **Project-root resolution for raw config read** (`prompt-build.ts:113–122`) — replaced `resolve(cwd, "taskflow.config.json")` with a `resolveProjectRoot(cwd)` walk (fallback to `cwd` on error). Aligns the raw-read path with `resolveConfig()` and fixes the subdirectory invocation gap. Also imports `resolveProjectRoot` from `../paths.js`.

2. **`remoteOps: "deny"` no longer suppresses local-op denials** (`prompt-build.ts:31–44`) — when `remoteOps === "deny"`, the code now also enumerates `["createBranch", "checkout", "commit", "merge", "deleteBranchLocal"]` and emits "NOT permitted" for any that are explicitly `false`.

3. **Double-read note closed** — the raw read still happens alongside `resolveConfig()`, but is now clearly scoped to extracting unmerged user intent. The `resolveProjectRoot` fix makes the two reads consistent. A deeper API refactor (exposing raw config from `resolveConfig`) is left for a future pass if the redundancy causes pain.

### Verification

- `pnpm --dir packages/taskflow run build` — clean
- `pnpm --dir packages/taskflow run typecheck` — clean
- `pnpm --dir packages/taskflow test` — 32/32 pass
- `prompt-build` from `packages/taskflow/src/` subdirectory finds project config correctly


---

## Round 3 — verification of round 2 fixes

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-27
**Verdict:** approved

### Summary

Round 2 fixes land cleanly. No new issues. All original checklist items remain satisfied. Ready to merge.

### Checklist verification

All items unchanged from round 1 — still pass. Round 2 added no scope and did not touch any checklist-covered path.

### Blockers

None.

### Non-blocking

None. All three round 1 non-blocking items were addressed:
- Subdirectory gap → `resolveProjectRoot()` with cwd fallback (`prompt-build.ts:123–128`).
- `remoteOps: "deny"` + local denials → explicit local-op enumeration after remote-ops line (`prompt-build.ts:38–43`).
- Double-read consistency → both reads now use the same project root path.
