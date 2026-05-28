# N66 — promote batch-init and batch-prompt-build to top-level commands

**Type:** rework
**Priority:** high
**Created:** 2026-05-28

## Problem

`batch-ui --init` and `batch-ui --prompt-build` (shipped in N64/v0.11.0) are CLI/agent maintenance operations — they have nothing to do with launching UIs. Burying them as flags of `batch-ui` is misleading and hard to discover. They belong as top-level commands: `insight-flow batch-init` and `insight-flow batch-prompt-build`. The README also lacks a clear "upgrading insight-flow" section that tells users to run both commands after every version bump.

## Goal

1. `insight-flow batch-init [--force] [--examples]` works as a top-level command (not a `batch-ui` flag).
2. `insight-flow batch-prompt-build` works as a top-level command (not a `batch-ui` flag).
3. `batch-ui --init` and `batch-ui --prompt-build` removed from the `batch-ui` branch in `cli.ts`.
4. `packages/taskflow/README.md` has an `## Upgrading insight-flow` section (or equivalent) that documents the post-upgrade workflow: install new version → `batch-init` → `batch-prompt-build`.
5. Help text updated; old flags removed.

## Scope

### In scope

- `packages/taskflow/src/cli.ts` — add `batch-init` and `batch-prompt-build` as top-level `else if` branches; remove `opts.init` and `opts["prompt-build"]` from the `batch-ui` branch; update help text.
- `packages/taskflow/src/commands/batch-ui.ts` — `cmdBatchInit` and `cmdBatchPromptBuild` stay as exported functions (no rename needed); `resolveInsightFlowBin` and `batchRun` stay as private helpers.
- `packages/taskflow/README.md` — remove `--init` / `--prompt-build` from the `batch-ui` flags table/section; add a top-level `## Upgrading insight-flow` section.

### Out of scope

- Renaming `cmdBatchInit` / `cmdBatchPromptBuild` internally — the exported names are fine.
- Any changes to `batchRun` or `runInProject` logic.
- Dashboard / server changes.

## Implementation plan

1. **Add top-level commands in `cli.ts`**
   - After the `batch-ui` block (currently around line 193), add:
     ```typescript
     } else if (command === "batch-init") {
       await cmdBatchInit(opts);
     } else if (command === "batch-prompt-build") {
       await cmdBatchPromptBuild(opts);
     }
     ```
   - Remove `else if (opts.init)` and `else if (opts["prompt-build"])` lines from inside the `batch-ui` branch (currently lines 189–192).

2. **Update help text in `cli.ts`**
   - Remove: `batch-ui --init [--force] [--examples]  Re-init all (or selected) registered projects`
   - Remove: `batch-ui --prompt-build               Re-sync role files in all (or selected) registered projects`
   - Add (in the batch-ui section or a new section):
     ```
     batch-init [--force] [--examples]     Re-init all (or selected) registered projects after upgrading
     batch-prompt-build                    Re-sync role files in all (or selected) registered projects after upgrading
     ```

3. **Update README — batch-ui section**
   - Remove the `### Batch operations` subsection (added in N65) from `## Multi-project launcher`.

4. **Add README — upgrading section**
   - Add `## Upgrading insight-flow` section (before or after `## Multi-project launcher`):
     - Step 1: `npm install -g insight-flow@latest`
     - Step 2: `insight-flow batch-init` — re-scaffolds role files in every registered project
     - Step 3: `insight-flow batch-prompt-build` — syncs `AGENT_ENFORCEMENT.md` and `agents.extend` into role files
     - Include example output for each command
     - Note: non-interactive / CI mode uses `< /dev/null`

5. **Build and verify**
   - `pnpm build` — no TypeScript errors.
   - `insight-flow batch-init < /dev/null` — runs against all registered projects.
   - `insight-flow batch-prompt-build < /dev/null` — runs against all registered projects.
   - `insight-flow batch-ui --init < /dev/null` — should no longer be recognized as a special flag (falls through to default `cmdBatchUi`).

## Verification

```bash
pnpm build                                # no errors
node dist/cli.js batch-init < /dev/null   # 4/4 succeeded
node dist/cli.js batch-prompt-build < /dev/null  # 4/4 succeeded
node dist/cli.js help | grep batch        # shows batch-init and batch-prompt-build, not batch-ui --init
```

## Notes

- Related: N64 (original implementation as `batch-ui` flags), N65 (v0.11.0 release).
- This will ship as v0.11.1 (patch) or v0.12.0 (minor) — decision at release time.
- The old `batch-ui --init` / `batch-ui --prompt-build` flags silently stop working (they fall through to the default `cmdBatchUi` launcher). That's acceptable — they were only in v0.11.0 for a day.
