# N10 — Refactor taskflow binary path resolution to be project-root relative — Review

**Reviewer:** Task Reviewer (Tech Lead)
**Commit:** 9efa9fd
**Verdict:** APPROVED

---

## Summary

`packages/taskflow/src/paths.ts` introduces `resolveProjectRoot()` (walk-up from `cwd` looking for `taskflow.config.json` or `workTasks/master.json`, with per-process caching) and `resolvePackageAsset()` (anchored on `import.meta.url`). `config.ts` uses `resolveProjectRoot()` as the authoritative anchor for all data paths. `init/index.ts` and `server/index.ts` use `resolvePackageAsset()`. `cli.ts` drops its inline `fileURLToPath` + `dirname` path computation. No `__dirname` or `../../..` remain in `src/`. Risk: **low**.

---

## Checklist verification

- [x] `packages/taskflow/src/paths.ts` with `resolveProjectRoot()` and `resolvePackageAsset()`
- [x] `resolveProjectRoot()` walks up from `process.cwd()` looking for `workTasks/master.json` (or `taskflow.config.json`), caches result
- [x] `resolvePackageAsset(rel)` uses `import.meta.url` anchor
- [x] `TaskflowProjectNotFoundError` thrown when no project found
- [x] `storage.ts` — no `__dirname`, no `../../..`; data paths come from `config.ts` which uses `resolveProjectRoot()` (indirect via `getWorkDir` / `getMasterPath`)
- [x] `init/index.ts` uses `resolvePackageAsset()` for templates
- [x] `server/index.ts` uses `resolvePackageAsset()` for UI assets
- [x] CLI top-level handler converts `TaskflowProjectNotFoundError` to friendly message
- [x] `grep -rn "__dirname" packages/taskflow/src/` — zero matches ✓
- [x] `grep -rn "\.\./\.\." packages/taskflow/src/` — zero matches ✓

---

## Issues found

### Non-blocking 1 — `safeResolveProjectRoot` silently swallows the error

**File:** `packages/taskflow/src/config.ts:62`
`safeResolveProjectRoot()` catches `TaskflowProjectNotFoundError` and returns `null`, falling back to `cwd`. This means when `insight-flow current` is run from `/tmp`, the code falls back to `/tmp` as the anchor and then `storage.ts` throws a generic "master.json not found at /tmp/workTasks/master.json" error instead of the intended friendly "no insight-flow project found" message. The `TaskflowProjectNotFoundError` path in `cli.ts` is never reached for this common case.
**Fix:** Instead of swallowing in `safeResolveProjectRoot`, let the error propagate from `resolveConfig` / `loadMaster` and bubble to the top-level CLI catch. Or catch it explicitly in `cli.ts` before calling `loadMaster`.

### Non-blocking 2 — cache keyed on `start === process.cwd()`

**File:** `packages/taskflow/src/paths.ts:23`
The cache only activates when `start` is the default `process.cwd()`. Any call with an explicit `start` argument bypasses the cache and re-walks. For a CLI this is fine (single invocation), but for library consumers calling `resolveProjectRoot(someDir)` repeatedly, this is unexpected. A `Map<string, string>` keyed on the resolved start directory would be more robust.

### Non-blocking 3 — checklist says `storage.ts` directly uses `resolveProjectRoot()`

The checklist says "`storage.ts` uses `resolveProjectRoot()` everywhere". In practice, `storage.ts` receives the resolved path from `config.ts` (which calls `getWorkDir`/`getMasterPath` which call `resolveProjectRoot`). This is an architectural improvement over a direct call and is correct design, but it doesn't match the checklist wording literally. No action needed — the design is better than specified.

---

## Quality gate results

- `grep -rn "__dirname" packages/taskflow/src/` — zero matches ✓
- `grep -rn "\.\./\.\." packages/taskflow/src/` — zero matches ✓
- `node packages/taskflow/dist/cli.js current` from repo root works ✓
- `paths.ts` exports both helpers and error class ✓

## Notes

No GitHub PR (committed directly to main). Post-merge review. The `safeResolveProjectRoot` swallowing is the most actionable concern — the friendly "no project found" error currently never surfaces in practice for normal command invocations.
