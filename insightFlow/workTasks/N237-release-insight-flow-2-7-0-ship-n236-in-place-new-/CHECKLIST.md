# N237 — Release insight-flow 2.7.0 — ship N236 (in-place new-project init) — Checklist

## Gaps found by the Release Check (must close first)

- [x] **Test gap:** `master-liveness.test.mjs` N221 — updated: default (no `location`) asserts in-place scaffold in the chosen folder; new `location:"subfolder"` case asserts `<chosen>/<slug>`; "rejects outside root" kept. Root-cause fix, not weakened. Full suite 355/355.
- [x] **Docs gap — hub reference:** `master-server.md` — added the init-location step, fixed the gitignore paragraph (two-mode: in-place `/insightFlow/`+`/taskflow.config.json` not `.claude/`; subfolder `/<slug>/`), endpoints row gained `location` + 409.
- [x] **Docs gap — guide:** `multi-project-master.md` step 4 — init-location step added; in-place gitignore sentence fixed.

## Release steps

- [x] Re-check (`/task-release-check`) → full suite green (355/355) + docs complete. Status → `ready-to-release`.
- [x] Fix-pass changes committed + pushed to `feat/N236-in-place-init` (test: + docs(hub:)); PR #153 now includes all 10 files, MERGEABLE/CLEAN.
- [ ] N236 merged to `main` (PR #153) as a `feat(master)` commit (`/task-release-merge`).
- [ ] release-please 2.7.0 PR merged (version bump + auto CHANGELOG).
- [ ] `insight-flow` published to npm (approve `npm-publish` env; use `workflow_dispatch` fallback if the OIDC auto-chain fails).
- [ ] Rollout: global + bulk-registered projects to 2.7.0.

## Quality gates

- [x] `pnpm --dir packages/taskflow exec tsc --noEmit` passes
- [x] `cd packages/taskflow && npm run lint` passes (0 errors; 2 pre-existing FlowEditor warnings)
- [x] `pnpm --dir packages/taskflow test` fully green (355/355)
- [x] Docusaurus site builds after the docs edits ("Generated static files")
- [x] No regressions in the master hub / New-project flow (suite green)

## Verification

- [ ] `master-liveness.test.mjs` N221 test passes; both in-place (default) and subfolder modes asserted.
- [ ] `master-server.md` + `multi-project-master.md` reflect the init-location choice + corrected gitignore + `location` endpoint field.
- [ ] release-please cut 2.7.0; `npm view insight-flow version` = 2.7.0; fresh install shows the in-place default.
