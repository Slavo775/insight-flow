# N74 — release v0.13.0 — N71 master overview liveness gating, N72 Done notification wording, N73 /task-analyze strategist — Checklist

## Done criteria

- [ ] `packages/taskflow/package.json` version bumped to `0.13.0`
- [ ] `CHANGELOG.md` (root) has a `## [0.13.0] — 2026-05-29` entry with one bullet each for N71, N72, N73 and a `See packages/taskflow/CHANGELOG.md` link
- [ ] `packages/taskflow/CHANGELOG.md` has a full `## [0.13.0] — 2026-05-29` entry with `### Added` (N73), `### Fixed` (N71), `### Changed` (N72), `### Notes` (re-run init)
- [ ] `packages/taskflow/README.md` "What's new" block updated to `## What's new in 0.13.0` with `/task-analyze` as the lead bullet
- [ ] `pnpm build` succeeds at repo root
- [ ] `pnpm pack:taskflow` produces `insight-flow-0.13.0.tgz` containing `task-analyze` files
- [ ] `npm publish` from `packages/taskflow/` succeeds
- [ ] `npm view insight-flow version` returns `0.13.0`
- [ ] Git tag `v0.13.0` created and pushed to origin

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] `grep -n "0.12.0" packages/taskflow/package.json packages/taskflow/README.md` returns zero matches
- [ ] No unrelated diffs in changelog / README outside the new 0.13.0 block

## Verification

- [ ] Tarball contents: `tar -tzf packages/taskflow/insight-flow-0.13.0.tgz | grep -E "(task-analyze|TASK_ANALYZER|ANALYSIS.md)"` returns ≥ 2 matches
- [ ] `npm view insight-flow version` returns `0.13.0` after publish
- [ ] `git ls-remote --tags origin v0.13.0` shows the pushed tag
- [ ] Manual: `npm i -g insight-flow@0.13.0`, run `insight-flow init --force` in `playground/`, confirm `.claude/commands/task-analyze.md` and `.claude/roles/TASK_ANALYZER_ROLE.md` are present
- [ ] Manual: in Claude Code in playground, `/task-analyze` resolves and loads the strategist role
