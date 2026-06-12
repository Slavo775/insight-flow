# N66 — promote bulk-init and bulk-prompt-build to top-level commands

**Type:** rework
**Priority:** high
**Created:** 2026-05-28
**Modified:** 2026-05-28

## Problem

`batch-ui --init` and `batch-ui --prompt-build` (shipped in N64/v0.11.0) are CLI/agent maintenance operations — they have nothing to do with launching UIs. Burying them as flags of `batch-ui` is misleading and hard to discover. They belong as top-level commands with the cleaner prefix `bulk-`: `insight-flow bulk-init` and `insight-flow bulk-prompt-build`. The README also lacks a clear "upgrading insight-flow" section that tells users to run both commands after every version bump.

## Goal

1. `insight-flow bulk-init [--force] [--examples]` works as a top-level command (not a `batch-ui` flag).
2. `insight-flow bulk-prompt-build` works as a top-level command (not a `batch-ui` flag).
3. `batch-ui --init` and `batch-ui --prompt-build` removed from the `batch-ui` branch in `cli.ts`.
4. `packages/taskflow/README.md` has an `## Upgrading insight-flow` section (or equivalent) that documents the post-upgrade workflow: install new version → `bulk-init` → `bulk-prompt-build`.
5. Help text updated; old flags removed.
6. `packages/taskflow/package.json` version bumped to `0.11.1`; `CHANGELOG.md` entry added for `[0.11.1]`.

## Scope

### In scope

- `packages/taskflow/src/cli.ts` — add `bulk-init` and `bulk-prompt-build` as top-level `else if` branches; remove `opts.init` and `opts["prompt-build"]` from the `batch-ui` branch; update help text to use `bulk-*` names.
- `packages/taskflow/src/commands/batch-ui.ts` — `cmdBatchInit` and `cmdBatchPromptBuild` stay as exported functions (no internal rename needed); `resolveInsightFlowBin` and `batchRun` stay as private helpers.
- `packages/taskflow/README.md` — remove `--init` / `--prompt-build` from the `batch-ui` flags table/section; add a top-level `## Upgrading insight-flow` section using `bulk-init` / `bulk-prompt-build`.
- `packages/taskflow/package.json` — bump `"version"` from `"0.11.0"` to `"0.11.1"`.
- `packages/taskflow/CHANGELOG.md` — add `## [0.11.1] — 2026-05-28` entry documenting the rename.

### Out of scope

- Renaming `cmdBatchInit` / `cmdBatchPromptBuild` internally — the exported names are fine.
- Any changes to `batchRun` or `runInProject` logic.
- Dashboard / server changes.

## Implementation plan

1. **Add top-level commands in `cli.ts`**
   - After the `batch-ui` block, add:
     ```typescript
     } else if (command === "bulk-init") {
       await cmdBatchInit(opts);
     } else if (command === "bulk-prompt-build") {
       await cmdBatchPromptBuild(opts);
     }
     ```
   - Remove `else if (opts.init)` and `else if (opts["prompt-build"])` lines from inside the `batch-ui` branch.

2. **Update help text in `cli.ts`**
   - Remove: `batch-ui --init [--force] [--examples]` and `batch-ui --prompt-build` entries.
   - Add:
     ```
     bulk-init [--force] [--examples]      Re-init all (or selected) registered projects (run after upgrading)
     bulk-prompt-build                     Re-sync role files in all (or selected) registered projects (run after upgrading)
     ```

3. **Update README — batch-ui section**
   - Remove the `### Batch operations` subsection from `## Multi-project launcher`.

4. **Add README — upgrading section**
   - Add `## Upgrading insight-flow` section:
     - Step 1: `npm install -g insight-flow@latest`
     - Step 2: `insight-flow bulk-init` — re-scaffolds role files in every registered project
     - Step 3: `insight-flow bulk-prompt-build` — syncs `AGENT_ENFORCEMENT.md` and `agents.extend` into role files
     - Include example output for each command
     - Note: non-interactive / CI mode uses `< /dev/null`

5. **Bump version and changelog**
   - `packages/taskflow/package.json`: `"0.11.0"` → `"0.11.1"`.
   - `packages/taskflow/CHANGELOG.md`: add `## [0.11.1] — 2026-05-28` with a `### Changed` entry for the rename.

6. **Build and verify**
   - `pnpm build` — no TypeScript errors.
   - `insight-flow bulk-init < /dev/null` — runs against all registered projects.
   - `insight-flow bulk-prompt-build < /dev/null` — runs against all registered projects.
   - `insight-flow batch-ui --init < /dev/null` — falls through to UI launcher (no init triggered).

## Verification

```bash
pnpm build                                 # no errors
node dist/cli.js bulk-init < /dev/null     # 4/4 succeeded
node dist/cli.js bulk-prompt-build < /dev/null  # 4/4 succeeded
node dist/cli.js help | grep bulk          # shows bulk-init and bulk-prompt-build
```

## Notes

- Related: N64 (original `batch-ui` flags), N65 (v0.11.0 release).
- Command prefix changed from `batch-` to `bulk-` — cleaner and unambiguous.
- Ships as v0.11.1 (patch).
- The old `batch-ui --init` / `batch-ui --prompt-build` flags silently fall through to the UI launcher. Acceptable — they were only in v0.11.0 briefly.
