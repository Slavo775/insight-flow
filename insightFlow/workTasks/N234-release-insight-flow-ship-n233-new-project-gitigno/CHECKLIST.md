# N234 — Release insight-flow — ship N233 (New-project gitignore feature) — Checklist

## Done criteria

### Gaps found by the Release Check (must close before shipping)

- [x] **Docs gap — hub reference:** `website/docs/built-ins/master-server.md` — added a "Git ignore" row to the modal options table + a new step 4 (shown only when the folder is a git repo root; shared vs local; default shared; footprint-ignored-by-default; non-fatal warning on failure).
- [x] **Docs gap — endpoints table:** same file — `GET /api/fs/list` row notes `hasGit`; `POST /api/projects/create` row notes optional `gitIgnore: "shared" | "local"`.
- [x] **Docs gap — guide:** `website/docs/guides/multi-project-master.md` — step 3 now mentions the git-ignore radio (repo-root only; shared vs local).

**Re-check (2nd pass) — READY:** tests 353/353, intent feature/minor, docs COMPLETE (re-audited, cross-checked vs code). Status → `ready-to-release`. Remaining boxes below are release-execution steps for the publisher.

### Release steps

- [ ] N233 committed on a branch as `feat(master): …(N233)` (3 files: master `server.ts`, `client/api.ts`, `client/NewProjectModal.tsx`) and PR opened.
- [ ] Docs changes committed as `docs(hub): …`.
- [x] Version state reconciled — release-please manifest + `package.json` synced to the already-published **2.5.0** baseline (npm `latest`=2.5.0 but manifest was stale at 2.4.1). release-please will now compute **2.6.0** for the N233 `feat`. (git tags v2.4.1/v2.5.0 still missing on the remote — release-please uses `last-release-sha`/manifest, so not blocking; backfill optional.)
- [ ] N233 + docs merged to `main` (squash) so release-please sees the `feat`/`docs` commits.
- [ ] release-please release PR merged (version bump + auto CHANGELOG entry for N233 under "Features").
- [ ] `insight-flow` published to npm (approve npm-publish env; pin `npm@^11.5.1` for Node 20).

## Quality gates

- [x] `pnpm --dir packages/taskflow exec tsc --noEmit` passes (checker)
- [x] `cd packages/taskflow && npm run lint` passes — 0 errors; 2 pre-existing FlowEditor.tsx warnings (checker)
- [x] `pnpm --dir packages/taskflow test` passes — 353/353 (checker)
- [x] Docusaurus site builds after the docs edits (`pnpm --dir website build` → "Generated static files")
- [x] No regressions in the master hub / New-project flow (docs-only change; source untouched)

## Verification

- [ ] N233 merged to `main` as a `feat(master)` commit; PR green.
- [x] `master-server.md` + `multi-project-master.md` reflect the gitignore options and `hasGit`/`gitIgnore` fields (confirmed by docs re-audit + Docusaurus build).
- [ ] release-please cut a minor bump; `packages/taskflow/CHANGELOG.md` has the N233 Features entry (auto).
- [ ] `npm view insight-flow version` shows the new version; a fresh install contains `gitInfoExcludePath` and the New-project modal shows the gitignore radio.
