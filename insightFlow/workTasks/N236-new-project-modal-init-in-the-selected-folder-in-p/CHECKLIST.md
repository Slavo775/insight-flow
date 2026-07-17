# N236 — New-project modal — init in the selected folder (in-place), respecting existing .claude/ and CLAUDE.md — Checklist

## Done criteria

- [x] Modal shows an "Init location" radio: **Use the selected folder** (default) vs **Create a new subfolder**.
- [x] In-folder mode uses the folder basename as the name/label (placeholder + submit fallback), so an empty name is fine.
- [x] `createProject` payload carries `location: "in-folder" | "subfolder"` (default in-folder); server reads it (`inPlace = location !== "subfolder"`).
- [x] Server: in-folder → `dir = realParent`; subfolder → `dir = resolve(realParent, slug)`; confinement kept (subfolder only; in-place dir is already the confined realParent).
- [x] `taskflow.config.json` present → 409 "insight-flow is already initialized in this folder: <dir>".
- [~] Conflict handling: **non-destructive** (init skips existing files) + `initProject` now returns `conflicts` (command files skipped because content differed) which the endpoint surfaces as a warning. Note: covers the `.claude/commands` surface (the realistic collision), not a full pre-abort over every init file.
- [x] `force: false` kept on the initProject call (unchanged, `server.ts:1264`).
- [x] N233 gitignore: in-place ignores only `/insightFlow/`, `/taskflow.config.json`, `/.taskflow-activity.jsonl` (NOT `.claude/`); subfolder still ignores `/<slug>/`.

## Quality gates

- [x] `pnpm --dir packages/taskflow exec tsc --noEmit` passes
- [x] `cd packages/taskflow && npm run lint` passes (0 errors; 2 pre-existing FlowEditor warnings)
- [x] init tests pass (13/13, incl. the 2 new N236 tests)
- [x] `pnpm --dir packages/taskflow run build` succeeds
- [x] No regressions in the master hub / New-project flow (verified live)

## Verification

- [x] Merge-safety test (unit): init into a temp folder with an existing `.claude/` command + `CLAUDE.md` → user files kept, CLAUDE.md content intact + marker added, `insightFlow/` created, `conflicts` empty.
- [x] Conflict test (unit): a same-named `task-implement.md` with different content → kept, and reported in `conflicts`.
- [x] Live: "in-folder" inits in place (path = the folder, no subfolder); "subfolder" makes `<folder>/<slug>`.
- [x] Live: re-init same folder → "insight-flow is already initialized" 409.
- [x] Live: in-place gitignore in a git repo → `/insightFlow/` etc. ignored, `.claude/` NOT ignored; user `.claude/` + `CLAUDE.md` preserved.
