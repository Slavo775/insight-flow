# N80 — Release insight-flow 1.0.0 (GA) — Checklist

## Done criteria

- [ ] `/LICENSE` exists at repo root (MIT, 2026, Slavo)
- [ ] `packages/taskflow/package.json` `license` is `"MIT"`
- [ ] `packages/taskflow/package.json` `version` is `1.0.0`
- [ ] `CHANGELOG.md` (root) has `## [1.0.0] — 2026-06-02` covering N74–N79 + a fresh empty `[Unreleased]`
- [ ] `packages/taskflow/CHANGELOG.md` has the same `## [1.0.0] — 2026-06-02` section
- [ ] `packages/taskflow/README.md` header updated from "What's new in 0.13.0" → "1.0.0"
- [ ] PR opened from `feat/N80-release-1-0-0-ga`; description lists the post-merge human steps
- [ ] Deprecated `batch` aliases left untouched (NOT removed)

## Quality gates

- [ ] `pnpm build` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No unintended changes outside the four files + new LICENSE

## Verification

- [ ] `npm pkg get version --prefix packages/taskflow` → `1.0.0`
- [ ] `pnpm pack:taskflow` then `tar -tzf <tarball> | grep LICENSE` lists `package/LICENSE`
- [ ] npm publish / `git tag v1.0.0` / `gh release create` NOT performed in this task (human, post-merge)
