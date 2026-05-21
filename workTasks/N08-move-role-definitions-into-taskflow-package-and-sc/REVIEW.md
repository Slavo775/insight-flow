# N08 — Move role definitions into taskflow package and scaffold them via init — Review

**Reviewer:** Task Reviewer (Tech Lead)
**Commit:** 467a82b
**Verdict:** REQUEST CHANGES

---

## Summary

All 8 role template files are in `packages/taskflow/templates/roles/`, `templates/` is in the `files` array, and `init` now copies templates per-file with created/skipped reporting using `resolvePackageAsset()`. The structural work is solid. However, the `--force` flag (an explicit checklist item) is absent, and the `.claude/skills/` scaffolding extension was not done. Risk: **low** (CLI works; the gaps are feature completeness, not correctness).

---

## Checklist verification

- [x] All 8 role files in `packages/taskflow/templates/roles/` — confirmed (8 files present)
- [x] `init` copies role templates per-file with created/skipped counts
- [ ] `init` skips existing files **unless `--force` is passed** — **MISSING: no `--force` flag**
- [x] Template path resolves via `resolvePackageAsset()` (correct, uses `import.meta.url` anchor)
- [x] `packages/taskflow/package.json` `"files"` includes `"templates"` — confirmed
- [ ] `.claude/skills/` scaffolding extended to cover all 8 roles — **NOT DONE**
- [ ] Repo root no longer holds duplicate role copies — not removed (commit acknowledges as follow-up)
- [ ] Package README documents `init` scaffolding — not updated

---

## Issues found

### Blocker 1 — `--force` flag missing

**File:** `packages/taskflow/src/cli.ts`, `packages/taskflow/src/init/index.ts`
**Why:** The checklist explicitly states "init skips existing files unless `--force` is passed". Users re-running `init` after updating their templates will have no way to refresh role files.
**Fix:** Parse `--force` from `process.argv` in `cli.ts` (or the init command handler) and pass a `force: boolean` option to `initProject()`. In `init/index.ts`, change `if (existsSync(dest)) { skipped++ }` to `if (!force && existsSync(dest)) { skipped++ }`.

### Non-blocking — `.claude/skills/` not scaffolded

The checklist asks for the skills scaffolding (the `.claude/commands/*.md` or `.claude/skills/*.md` entries for each role) to also be created by `init`. The current `init` generates CLAUDE.md and command stubs but doesn't cover all 8 role-linked skills. This can be a follow-up since the roles themselves are scaffolded and the main value is delivered.

### Non-blocking — root-level role files still exist

The commit message explicitly defers this ("left as follow-up"). Accepted. But the TASK.md goal #5 was "dogfood: delete root-level role files, run init --force, confirm roles reappear". This hasn't been done. Once `--force` is implemented, the dogfooding step should be completed.

### Non-blocking — rolesDir default is `.claude/roles`, not repo root

TASK.md says init "copies role files into the consumer repo root (or a configurable subdirectory)". The current default is `config.rolesDir = ".claude/roles"` which puts roles under `.claude/`. This is a UX divergence from the spec but arguably a better default for Claude Code workflows. Acceptable as-is — document it in the README.

---

## Quality gate results

- 8 role files present in `packages/taskflow/templates/roles/` ✓
- `init` creates per-file with reporting ✓
- `resolvePackageAsset` used for template path ✓
- `"templates"` in `files` array ✓

## Next actions

1. **Blocker:** Add `--force` flag to `init` command; pass to `initProject()` and use in per-file copy logic.
2. **Follow-up task:** Dogfood by removing root-level role files and running `insight-flow init --force`.
3. **Follow-up task:** Extend init to scaffold the `.claude/skills/` entries for all 8 roles.
4. **Non-blocking:** Update package README with what `init` scaffolds and the `rolesDir` config option.

## Notes

No GitHub PR (committed directly to main). Post-merge review.

---

## Round 2 — Re-review (fix commit de9d15c)

**Verdict:** APPROVED

### Blocker verification

**Blocker 1 — `--force` flag missing:** RESOLVED.
- `initProject(cwd, force = false)` — signature updated (`init/index.ts:13`).
- Copy loop: `if (!force && existsSync(dest))` — existing files overwritten when `force=true` (`init/index.ts:70`).
- `cli.ts:119`: `initProject(process.cwd(), !!opts.force)` — flag wired from parsed args.
- `cli.ts:65`: help text updated to show `init [--force]`.
- Change is minimal and targeted — no unrelated edits.

All prior non-blocking items remain deferred (`.claude/skills/` scaffolding, root role file cleanup, README update) — none were blockers and none were touched in the fix, which is correct scope discipline.

### Quality gates (re-check)

- `pnpm --filter insight-flow typecheck` — passes ✓
- `pnpm --filter insight-flow build:cli` — passes ✓
