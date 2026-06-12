# N64 — batch-init and batch-prompt-build for registered projects

**Type:** feat
**Priority:** medium
**Created:** 2026-05-28

## Problem

After publishing a new version of insight-flow (e.g. v0.10.0), all registered consumer projects need their scaffolded role files re-synced (`prompt-build --apply`) and occasionally need `init` re-run (e.g. to pick up new template changes). Doing this one project at a time via `insight-flow batch-ui --list` → manual `cd` → manual command is slow and error-prone.

## Goal

1. `insight-flow batch-ui --init [--force] [--examples]` runs `insight-flow init` in each selected registered project and reports per-project pass/fail.
2. `insight-flow batch-ui --prompt-build` runs `insight-flow prompt-build --apply` in each selected registered project and reports per-project pass/fail.
3. Both commands use the same interactive multi-select picker already in `cmdBatchUi` so the user can target a subset of registered projects.
4. Non-TTY mode skips the picker and runs against all registered projects (consistent with `cmdBatchUi` behaviour).
5. A summary line is printed at the end: `X/Y succeeded`.

## Scope

### In scope

- `packages/taskflow/src/commands/batch-ui.ts` — add `cmdBatchInit` and `cmdBatchPromptBuild` exported functions.
- `packages/taskflow/src/cli.ts` — wire `batch-ui --init` → `cmdBatchInit`, `batch-ui --prompt-build` → `cmdBatchPromptBuild`; add both to help text.

### Out of scope

- New file creation; only extend existing `batch-ui.ts`.
- Changes to `initProject` or `cmdPromptBuild` internals.
- Any GUI / dashboard changes.

## Implementation plan

1. **Add `runInProject` helper** (`batch-ui.ts`)
   - Signature: `async function runInProject(projectPath: string, args: string[]): Promise<{ ok: boolean; output: string }>`
   - Spawns `insight-flow <args>` with `cwd` set to `projectPath`, captures stdout+stderr, resolves `ok` on exit code 0.
   - Use `spawn` (already imported) with `stdio: "pipe"`.

2. **Add `cmdBatchInit`** (`batch-ui.ts`)
   - Reads registry via `readBatchUiRegistry()`.
   - In TTY mode: shows interactive picker (reuse `interactiveSelect`); pass `readBatchUiLastSelected()` as defaults.
   - Builds `initArgs`: `["init"]`; append `--force` if `opts.force`, `--examples` if `opts.examples`.
   - Iterates chosen entries: calls `runInProject(entry.path, initArgs)`, prints `✓ label` or `✗ label\n<output>`.
   - Prints summary `X/Y succeeded`.

3. **Add `cmdBatchPromptBuild`** (`batch-ui.ts`)
   - Same picker flow as `cmdBatchInit`.
   - Runs `runInProject(entry.path, ["prompt-build", "--apply"])` for each chosen entry.
   - Prints per-project result + summary.

4. **Wire in `cli.ts`**
   - Import `cmdBatchInit`, `cmdBatchPromptBuild` alongside existing `cmdBatchUi*` imports.
   - In the `batch-ui` branch: add `else if (opts.init) { await cmdBatchInit(opts); }` and `else if (opts["prompt-build"]) { await cmdBatchPromptBuild(opts); }` before the existing `--add / --remove / --list / default` checks.
   - Add to help text: `batch-ui --init [--force] [--examples]   Re-init all (or selected) registered projects` and `batch-ui --prompt-build                    Re-sync role files in all (or selected) registered projects`.

5. **Verify flags parse correctly**
   - `--init`, `--prompt-build`, `--force`, `--examples` are all boolean flags; confirm `parseArgs` in `cli.ts` already handles boolean flags generically (no explicit declaration needed).

## Verification

```bash
# List registered projects first
insight-flow batch-ui --list

# Batch init (non-interactive, all)
insight-flow batch-ui --init < /dev/null

# Batch init with force (non-interactive)
insight-flow batch-ui --init --force < /dev/null

# Batch prompt-build (non-interactive, all)
insight-flow batch-ui --prompt-build < /dev/null
```
Expected: each project prints `✓ <label>` or `✗ <label>` with error output; final line shows `X/Y succeeded`.

## Notes

- `readBatchUiLastSelected` / `writeBatchUiLastSelected` are already imported — reuse for the picker default state.
- The `interactiveSelect` function is not exported; `cmdBatchInit` and `cmdBatchPromptBuild` live in the same file so they can call it directly.
- Related: N63 (v0.10.0 release) — the post-release `prompt-build --apply` workflow is the primary driver for this task.
