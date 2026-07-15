# N241 — Release insight-flow 2.8.1 — ship N240 hub crash + notification-restart fix — Checklist

## Gaps to fix before release

- [x] None — release-check found no gaps (tests pass, intent clear, docs complete)

## Release steps

- [ ] Merge release PR #158 (`chore(main): release 2.8.1`) — bumps `package.json` → 2.8.1, writes CHANGELOG, tags `v2.8.1`
- [ ] Publish to npm via `gh workflow run release-publish.yml --ref main` (OIDC-safe path — the release-please `workflow_call` auto-chain fails `ENEEDAUTH`)
- [ ] Approve the `npm-publish` deployment (self-approve the pending deployment)
- [ ] Confirm `npm view insight-flow version` → `2.8.1`; `v2.8.1` tag + GitHub release exist
- [ ] Roll out 2.8.1 (global install + registered projects)
- [ ] **Live notification smoke** (N240's deferred verification): on 2.8.1, a real `active → done` fires a "Claude finished" banner and a permission prompt fires "needs permission"

## Quality gates (confirmed at release-check)

- [x] Build passes (`pnpm --dir packages/taskflow build`)
- [x] `typecheck` passes (root + both client tsconfigs)
- [x] Tests pass — 363/363 on `main`
- [x] No regressions

## Verification

- [ ] `npm view insight-flow version` returns `2.8.1` after publish
- [ ] Hub notifications fire on a real agent transition (the whole point of N240)
