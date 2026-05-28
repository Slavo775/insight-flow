# N64 — batch-init and batch-prompt-build for registered projects — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-28
**PR:** https://github.com/Slavo775/insight-flow/pull/43
**Verdict:** approved

## Summary

Adds `batch-ui --init` and `batch-ui --prompt-build` sub-commands to `batch-ui.ts`. Implementation introduces a `runInProject` helper (spawn + capture), a shared `batchRun` loop (registry lookup → TTY picker or non-interactive all-projects → per-project `✓ / ✗` output → summary line), and two thin wrappers. Wired in `cli.ts` with correct flag routing and help text. Risk is low — additive only, no existing command paths touched. The diff also includes the `prompt-build.ts` rolesDir placement fix and an `@AGENT_SECURITY.md` injection into `buildEnforcementBlock`; those are separate concerns that landed on this branch alongside N64.

## Checklist verification

- [x] `cmdBatchInit` exported from `packages/taskflow/src/commands/batch-ui.ts` — pass
- [x] `cmdBatchPromptBuild` exported from `packages/taskflow/src/commands/batch-ui.ts` — pass
- [x] `insight-flow batch-ui --init` wired in `cli.ts`, appears in help text — pass
- [x] `insight-flow batch-ui --prompt-build` wired in `cli.ts`, appears in help text — pass
- [x] Both commands run against all projects in non-TTY mode — pass (verified manually, 4/4 succeeded)
- [x] Both commands show per-project `✓ / ✗` result lines and a `X/Y succeeded` summary — pass
- [x] `pnpm --dir packages/taskflow run build` passes — pass
- [x] No regressions in `batch-ui --list`, `--add`, `--remove`, default launch — pass (routing chain unchanged, new flags checked before default)

## Blockers

None.

## Non-blocking

1. **`runInProject` — no `error` event handler** (`batch-ui.ts:354–361`)  
   If `insight-flow` fails to spawn (e.g. binary missing from PATH due to env isolation), the returned Promise never resolves and the batch loop hangs silently. In practice impossible when the binary is already running, but adding `child.on("error", (err) => res({ok: false, output: err.message}))` would make the function robust.

2. **`@AGENT_SECURITY.md` in `buildEnforcementBlock`** (`prompt-build.ts:10`)  
   This line injects `@AGENT_SECURITY.md` at the top of every generated `AGENT_ENFORCEMENT.md`. Projects that haven't run `init` since N63 won't have `AGENT_SECURITY.md` in their roles dir, leaving a dangling `@` reference. Consider guarding: only emit the reference if `AGENT_SECURITY.md` exists in the target dir, or document that `batch-init` should be run first to deploy the file.

## Security & edge cases

No auth, no file-system writes beyond what the sub-command already does. `runInProject` passes user-controlled `projectPath` as `cwd` to `spawn` — safe since it comes from the registry (written only by the user via `--add`), not from untrusted input.

## Notes

- `prompt-build.ts` changes on this branch are a mix of N64 work (rolesDir placement logic) and a separate fix (`@AGENT_SECURITY.md` injection + cosmetic reformatting). Consider splitting into separate commits before merge for clarity.
- Related: N63 (v0.10.0 release) — `batch-prompt-build` makes the post-release sync workflow fully automated.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-28
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

- `batch-ui --init` should also pass through `--yes` / `-y` (and any future flags init gains). Currently only `--force` and `--examples` are forwarded. Since `init` accepts `--yes` to skip interactive prompts, batch use cases (CI, post-release automation) would benefit from being able to pass it through.

### Notes

- `prompt-build` hardcoding `--apply` is intentional and correct — the whole point of `batch-prompt-build` is to apply, not preview.
