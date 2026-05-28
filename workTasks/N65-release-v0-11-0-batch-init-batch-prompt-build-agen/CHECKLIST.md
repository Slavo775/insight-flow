# N65 — release v0.11.0 — batch-init, batch-prompt-build, AGENT_ENFORCEMENT in rolesDir — Checklist

## Done criteria

- [ ] `packages/taskflow/package.json` version is `0.11.0`
- [ ] `CHANGELOG.md` has `## [0.11.0]` section with Added + Fixed entries for N64
- [ ] `packages/taskflow/CHANGELOG.md` has the same `## [0.11.0]` section
- [ ] `packages/taskflow/README.md` has a `### Batch operations` section (or equivalent) with full examples for `--init` and `--prompt-build` including flags, example output, and post-release workflow
- [ ] `pnpm build` passes with no TypeScript errors
- [ ] Package published: `npm view insight-flow version` returns `0.11.0`
- [ ] Git tag `v0.11.0` exists and is pushed to origin

## Quality gates

- [ ] `pnpm build` passes cleanly

## Verification

- [ ] `npm view insight-flow version` → `0.11.0`
- [ ] `git tag --list | grep v0.11.0` → `v0.11.0`
- [ ] `npx insight-flow@0.11.0 batch-ui --help` shows `--init` and `--prompt-build` in output
