# N10 — Refactor taskflow binary path resolution to be project-root relative — Checklist

## Done criteria

- [ ] `packages/taskflow/src/paths.ts` exposes `resolveProjectRoot()` and `resolvePackageAsset()`
- [ ] `resolveProjectRoot()` walks up from `process.cwd()` looking for `workTasks/master.json`, caches the result
- [ ] `resolvePackageAsset(rel)` uses `import.meta.url` to anchor on the package install location
- [ ] `TaskflowProjectNotFoundError` thrown when no project is found upward of `cwd`
- [ ] `storage.ts` uses `resolveProjectRoot()` everywhere (no `__dirname`, no `../../..`)
- [ ] `init/index.ts` uses `resolvePackageAsset()` for templates
- [ ] `server/dashboard.ts` uses `resolvePackageAsset()` for UI assets
- [ ] CLI top-level handler converts `TaskflowProjectNotFoundError` into a friendly error message

## Quality gates

- [ ] `pnpm --filter insight-flow typecheck` passes
- [ ] `pnpm --filter insight-flow build:cli` succeeds
- [ ] `pnpm lint` passes
- [ ] No regressions in affected area
- [ ] `grep -rn "\.\./\.\./" packages/taskflow/src/` returns zero matches
- [ ] `grep -rn "__dirname" packages/taskflow/src/` returns zero matches

## Verification

- [ ] `insight-flow current` works from repo root
- [ ] `insight-flow current` works from `workTasks/` subdirectory (project root resolved upward)
- [ ] `insight-flow current` from `/tmp` (or any dir outside a project) prints "no insight-flow project found" and exits non-zero
- [ ] `npm pack` + `npm i -g ./insight-flow-X.Y.Z.tgz` + run from a separate project directory → CLI resolves that project's `workTasks/` correctly
- [ ] `insight-flow init` writes templates to the consumer's project root even when invoked from a deeply nested subdirectory
- [ ] Bundled dashboard (`dist/ui`) loads correctly regardless of invocation directory
