# N257 — Release insight-flow 2.12.0 — N253–N256 code-audit cleanup — Checklist

## Release gaps to resolve (from the release check)

- [ ] **[BLOCKER — needs human decision]** Choose the release-please trigger: (A) force 2.12.0 minor via a `feat:` commit, (B) patch 2.11.1 via `fix:`, or (C) manual bump+tag. The merged `refactor:` commit alone produces no release PR.
- [ ] Apply the chosen trigger and confirm release-please opens the release PR (or the manual bump is committed)
- [ ] CHANGELOG surfaces the 256KB master-POST body-cap / 413 behavior change (add a manual line — a `refactor:` commit hides it under release-please defaults)
- [ ] *(optional)* `website/docs/built-ins/master-server.md` — one-line note on the 256KB POST body limit

## Release steps

- [ ] Merge the release-please PR (bumps `package.json` + `.release-please-manifest.json`, updates CHANGELOG, tags `v2.12.0`)
- [ ] Approve the npm-publish deployment env (`gh api ... pending_deployments`)
- [ ] Publish succeeds (pin `npm@^11.5.1` — npm@latest v12 breaks Node 20 publish)
- [ ] `npm view insight-flow version` == released version; tag pushed

## Quality gates (confirmed by the release check — N257)

- [x] Full typecheck (CLI + both client tsconfigs) — 0 errors
- [x] Build clean (CLI + dashboard + master + hub-notify)
- [x] Tests: 374/374 pass
- [x] No regressions (N253–N256 reviewed + human-approved, PR #168)

## Verification

- [ ] release-please PR opened + merged; `v2.12.0` (or agreed version) tagged
- [ ] `npm view insight-flow version` shows the new version
- [ ] CHANGELOG contains the N253–N256 summary + body-cap note
