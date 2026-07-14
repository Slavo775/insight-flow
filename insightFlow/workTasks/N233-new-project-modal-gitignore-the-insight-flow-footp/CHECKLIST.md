# N233 — New-project modal — gitignore the insight-flow footprint (shared or local) — Checklist

## Done criteria

- [x] `GET /api/fs/list` returns a `hasGit` flag for the listed dir (`.git` present at that dir's root).
- [x] New-project modal shows a two-option radio (`shared` / `local`) only when the chosen folder has git; hidden otherwise.
- [x] Radio defaults to `shared`.
- [x] `createProject` payload carries `gitIgnore?: "shared" | "local"`; server validates it to that literal union.
- [x] "shared" appends `<slug>/` to `<realParent>/.gitignore`; "local" appends `<slug>/` to `<realParent>/.git/info/exclude`.
- [x] Ignore-write is idempotent (no duplicate line on re-create) and confined under `realParent`.
- [x] No `.git` at chosen folder → no ignore write; behavior matches today.

## Quality gates

- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (0 errors; 2 pre-existing warnings in untouched FlowEditor.tsx)
- [x] Related tests pass (no test suite covers this path; verified live against the running server)
- [x] No regressions in affected area

## Verification

- [x] Git-repo folder: create with `shared` → repo `.gitignore` gains `<slug>/`; re-create does not duplicate (line count = 1).
- [x] Git-repo folder: create with `local` → repo `.git/info/exclude` gains `<slug>/`; `.gitignore` untouched.
- [x] Non-git folder: `gitIgnore` sent but no `.git` → no ignore write (no `.gitignore` created).
- [x] `git check-ignore` in the repo confirms both new project subfolders are ignored.
