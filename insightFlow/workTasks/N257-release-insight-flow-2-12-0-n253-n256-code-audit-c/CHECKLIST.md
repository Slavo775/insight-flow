# N257 — Release insight-flow 2.12.0 — N253–N256 code-audit cleanup — Checklist

## Release gaps to resolve (from the release check)

- [x] **[BLOCKER — human decision]** Trigger chosen: **B — patch 2.11.1 via `fix:`**
- [x] Applied: `fix(master):` commit + PR **#169** (squash-merged `fcf8fa3`); release-please opened release PR **#170** (`chore(main): release 2.11.1`)
- [x] CHANGELOG surfaces the body-cap change — auto-generated under "Bug Fixes" in #170 (release-please owns CHANGELOG.md)
- [x] Doc notes added: `website/docs/built-ins/master-server.md` + `packages/taskflow/README.md`

## Release steps

- [x] Merge PR **#169** into `main` → release-please opened the `2.11.1` release PR (**#170**)
- [ ] Merge release PR **#170** (bumps `package.json` + manifest to 2.11.1, updates CHANGELOG, tags `v2.11.1`) — **Publisher / gated**
- [ ] Approve the npm-publish deployment env (`gh api ... pending_deployments`)
- [ ] Publish succeeds (pin `npm@^11.5.1` — npm@latest v12 breaks Node 20 publish)
- [ ] `npm view insight-flow version` == `2.11.1`; tag pushed

> **Version corrected to 2.11.1** (option B — patch). The task title still says 2.12.0 (created before the trigger decision); the actual release is **2.11.1**.

## Quality gates (confirmed by the release check — N257)

- [x] Full typecheck (CLI + both client tsconfigs) — 0 errors
- [x] Build clean (CLI + dashboard + master + hub-notify)
- [x] Tests: 374/374 pass
- [x] No regressions (N253–N256 reviewed + human-approved, PR #168)

## Verification

- [ ] release-please PR opened + merged; `v2.12.0` (or agreed version) tagged
- [ ] `npm view insight-flow version` shows the new version
- [ ] CHANGELOG contains the N253–N256 summary + body-cap note
