# N22 — Release insight-flow v0.5.0 — Checklist

## Done criteria

- [ ] N19, N20, N21 all `merged` on main before release work begins.
- [ ] `packages/taskflow/package.json` `version` bumped to `0.5.0`.
- [ ] `CHANGELOG.md` exists at repo root with Keep-a-Changelog formatted 0.5.0 entry (Fixed / Added / Changed).
- [ ] README has a "0.5.0 highlights" callout near the top.
- [ ] `npm publish` succeeded; `npx insight-flow@0.5.0 --version` returns `0.5.0`.
- [ ] `git tag v0.5.0` exists on the release commit and is pushed to origin.
- [ ] GitHub release `v0.5.0` is published with the CHANGELOG entry as its body.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes on release commit.
- [ ] `pnpm --dir packages/taskflow run build` passes.
- [ ] `pnpm --dir packages/taskflow test` passes.
- [ ] Manual smoke against playground workspace shows Socket.IO live updates, notifications, multi-project overview, phase markers all working end-to-end.

## Verification

- [ ] `npx insight-flow@0.5.0 --version` from a fresh tmp dir prints `0.5.0`.
- [ ] `npx insight-flow@0.5.0 init` in a fresh repo installs four hooks (PostToolUse, UserPromptSubmit, Stop, PreToolUse) and writes a config with the new keys.
- [ ] `pnpm view insight-flow versions` lists `0.5.0`.
- [ ] GitHub release page exists at `releases/tag/v0.5.0` with full CHANGELOG copy.
