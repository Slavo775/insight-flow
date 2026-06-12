# N13 — Release insight-flow v0.4.0 with changelog N05–N12 — Checklist

## Done criteria

- [ ] `packages/taskflow/package.json` version is `0.4.0`
- [ ] `packages/taskflow/CHANGELOG.md` exists with a `## [0.4.0]` section
- [ ] CHANGELOG covers all 8 tasks: N05, N06, N07, N08, N09, N10, N11, N12
- [ ] `pnpm --filter insight-flow run build` exits 0
- [ ] `npx tsc --noEmit` passes in `packages/taskflow/`
- [ ] `npm publish` succeeds from `packages/taskflow/`
- [ ] Git tag `v0.4.0` created and pushed to origin
- [ ] `npm show insight-flow version` returns `0.4.0`

## Quality gates

- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm run build` exits 0
- [ ] No regressions — existing CLI commands still work after version bump

## Verification

- [ ] `npm show insight-flow version` → `0.4.0`
- [ ] `npx insight-flow --version` → `0.4.0`
- [ ] `git tag --list 'v0.4.0'` shows the tag
- [ ] `npx insight-flow@0.4.0 --version` resolves and prints `0.4.0`
