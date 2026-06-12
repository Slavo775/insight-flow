# N74 — release v0.13.0 — N71 master overview liveness gating, N72 Done notification wording, N73 /task-analyze strategist

**Type:** feat
**Priority:** high
**Created:** 2026-05-29

## Problem

Three tasks have landed on `main` since the 0.12.0 release (N71, N72, N73) but no version has been cut, no `CHANGELOG.md` entry exists for them, the root `README.md` / `packages/taskflow/README.md` "What's new" sections still advertise 0.12.0, and consumers cannot pull the work via `npm install -g insight-flow@latest`. The headline shipment here is N73's new `/task-analyze` strategist agent — a user-visible pipeline change that needs to be called out clearly in release notes so existing installs know to re-run `insight-flow init` to scaffold `.claude/commands/task-analyze.md`.

## Goal

1. Bump `packages/taskflow/package.json` from `0.12.0` → `0.13.0` (minor — new agent + visual fixes, no breaking schema/CLI changes).
2. Add a `## [0.13.0] — 2026-05-29` entry to both `CHANGELOG.md` (root summary) and `packages/taskflow/CHANGELOG.md` (full detail) covering N71, N72, N73.
3. Update the "What's new in 0.X.Y" block in `packages/taskflow/README.md` (currently 0.12.0) to summarise the 0.13.0 highlights — lead with `/task-analyze`.
4. Build, pack, publish to npm under the existing `sslavo` account, tag the release, and verify `npm view insight-flow version` returns `0.13.0`.
5. Note in the changelog that consumers must re-run `insight-flow init` to pick up `.claude/commands/task-analyze.md`, `.claude/roles/TASK_ANALYZER_ROLE.md`, and the updated `ANALYSIS.md.tpl` template.

## Scope

### In scope

- `packages/taskflow/package.json` — bump `"version": "0.12.0"` → `"0.13.0"`.
- `CHANGELOG.md` (repo root) — insert a new `## [0.13.0] — 2026-05-29` block above `## [0.12.0]`. Three short bullets, one per task, each pointing to `packages/taskflow/CHANGELOG.md` for full detail. Mirror the style of the existing 0.11.x / 0.12.0 entries.
- `packages/taskflow/CHANGELOG.md` — full per-task entry:
  - **Added (N73)** — `/task-analyze` pre-taskmaster strategist agent. New `TASK_ANALYZER_ROLE.md` at repo root (also synced to `packages/taskflow/templates/roles/`), new `packages/taskflow/templates/task/ANALYSIS.md.tpl` narrative template, new `--with-analysis` flag on `insight-flow create` (scaffolds `ANALYSIS.md` into the new task folder when set; default behaviour unchanged), new entry in `AGENT_ROLE_FILE_MAP` so `agents.extend.task-analyze` works. `insight-flow init` now scaffolds `.claude/commands/task-analyze.md` and includes `/task-analyze` in the CLAUDE.md slash-command table.
  - **Fixed (N71)** — Master overview cards no longer keep their green `claudeStatus` highlight after a project server goes offline. Liveness gate (`Date.now() - lastSeenAt < 60s`) is applied inline in `renderCard` to `statusCls`, `claudeBadgeCls`, and `claudeBadgeLabel`. Per-card `live`/`stale`/`down` badge and the `refreshBadges` 30 s interval removed entirely; subtitle counter `N projects · M live` retained.
  - **Changed (N72)** — Dashboard browser notification on agent turn-end now reads `Done` (was `Awaiting input`). Updated in both `fireDesktopNotif()` (legacy `agent-done` socket event) and `fireStatusDesktopNotif(toStatus)` (N68 derived-status `status` socket event, `toStatus === 'done'` branch only). `awaiting-permission` branch unchanged (`Permission required`).
  - **Notes** — Consumers should re-run `insight-flow init` after upgrading to pick up `.claude/commands/task-analyze.md`, `.claude/roles/TASK_ANALYZER_ROLE.md`, and the new `templates/task/ANALYSIS.md.tpl`.
- `packages/taskflow/README.md` — update the `## What's new in 0.12.0` heading to `## What's new in 0.13.0`, replace the four-bullet body with the 0.13.0 highlights (lead bullet: `/task-analyze`), keep the `See [CHANGELOG.md](...)` footer link unchanged.
- Build + pack + publish:
  - `pnpm build` (root, ensures both `taskflow` and `insight-flow-master` rebuild).
  - `pnpm pack:taskflow` (sanity-check the tarball contents include the new role, command stub, and template).
  - `npm publish` from `packages/taskflow/` under the existing `sslavo` account (no new dist-tag — default `latest`).
  - `git tag v0.13.0 && git push origin v0.13.0`.

### Out of scope

- No CLI behaviour changes beyond what N71/N72/N73 already merged. This task is paperwork + publish only.
- No additional bulk-init / bulk-prompt-build invocations from inside this task. Calling those is the consumer's job after upgrading; the release note flags the requirement.
- No version bumps in `packages/insight-flow-master/package.json` (master ships from the same repo but versions independently; if it has its own `package.json`, leave it).
- No npm dist-tag work beyond default `latest`.
- No GitHub release draft (mirror previous releases: tag-only is enough).
- No backport / patch versions.

## Implementation plan

1. **Read existing 0.12.0 entries as the template** — open both `CHANGELOG.md` (root) and `packages/taskflow/CHANGELOG.md`, copy the structural skeleton of the `## [0.12.0]` block. Sub-headings used so far: `### Added`, `### Fixed`, `### Changed`, `### Notes`. Use the same set for 0.13.0.

2. **Bump version** — edit `packages/taskflow/package.json`: `"version": "0.12.0"` → `"0.13.0"`. Single-line change.

3. **Author `packages/taskflow/CHANGELOG.md` entry** — insert above `## [0.12.0] — 2026-05-28`:
   - `## [0.13.0] — 2026-05-29`
   - `### Added` — full N73 paragraph (see Goal §2 for the wording skeleton). Must name the new files: `TASK_ANALYZER_ROLE.md`, `packages/taskflow/templates/roles/TASK_ANALYZER_ROLE.md`, `packages/taskflow/templates/task/ANALYSIS.md.tpl`, `.claude/commands/task-analyze.md`. Mention `--with-analysis` flag on `insight-flow create`. Mention `AGENT_ROLE_FILE_MAP` extension.
   - `### Fixed` — full N71 paragraph. Name `packages/insight-flow-master/src/overview.ts` and the removed pieces (`conn-badge` CSS, `badgeInfo` helper, `refreshBadges` interval, `data-badge` markup) plus the added liveness gate (60 s threshold against `lastSeenAt`).
   - `### Changed` — full N72 paragraph. Name `packages/taskflow/src/server/dashboard.ts`, both functions (`fireDesktopNotif`, `fireStatusDesktopNotif`), and the unchanged `awaiting-permission` branch.
   - `### Notes` — "Re-run `insight-flow init` after upgrading to scaffold `.claude/commands/task-analyze.md` and the analyzer role into your project."

4. **Author `CHANGELOG.md` (root) summary entry** — insert above `## [0.12.0] — 2026-05-28`:
   - `## [0.13.0] — 2026-05-29`
   - `### Added` — one bullet for N73 (1–2 sentences, summary only).
   - `### Fixed` — one bullet for N71.
   - `### Changed` — one bullet for N72.
   - Close with: `See [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md) for the full entry.`

5. **Update `packages/taskflow/README.md` "What's new" block** — find `## What's new in 0.12.0` and replace heading + body with `## What's new in 0.13.0` plus four bullets:
   - Lead: `/task-analyze` pre-taskmaster strategist agent.
   - Master overview liveness gating (cards go neutral after 60 s offline, no more stale-green).
   - Dashboard browser notification reads "Done" on agent turn-end.
   - Re-run `insight-flow init` after upgrading to scaffold the new role and command files.
   - Keep the `See [CHANGELOG.md](...)` footer line.

6. **Build + pack + smoke-check tarball** — from repo root:
   - `pnpm build`
   - `pnpm pack:taskflow`
   - `tar -tzf packages/taskflow/insight-flow-0.13.0.tgz | grep -E "(task-analyze|TASK_ANALYZER|ANALYSIS.md)"` — confirm the analyzer files are bundled. (If `pnpm pack:taskflow` outputs the tarball at a different path, adjust the grep target accordingly.)

7. **Publish to npm** — `cd packages/taskflow && npm publish` (assumes existing logged-in `sslavo` session; if not, surface `npm login` requirement to the human and stop). Verify: `npm view insight-flow version` returns `0.13.0`. Hold for human confirmation if 2FA is required.

8. **Tag & push** — `git tag v0.13.0 && git push origin v0.13.0`. No GitHub release draft this round (matches prior releases).

## Verification

- `pnpm build` succeeds at repo root.
- `pnpm pack:taskflow` produces `packages/taskflow/insight-flow-0.13.0.tgz`.
- `tar -tzf packages/taskflow/insight-flow-0.13.0.tgz | grep -c task-analyze` returns ≥ 2 (the role template + the slash-command init source path, however the bundle ships them).
- `npm view insight-flow version` returns `0.13.0` after publish.
- `git tag -l v0.13.0` lists the tag locally; `git ls-remote --tags origin v0.13.0` confirms it pushed.
- Manual: run `insight-flow init --force` in `playground/` against the freshly-published version (`npm i -g insight-flow@0.13.0`), confirm `.claude/commands/task-analyze.md` is present and `/task-analyze` resolves in Claude Code.
- Grep check: `grep -n "0.12.0" packages/taskflow/package.json packages/taskflow/README.md` returns zero matches after edits.
- `CHANGELOG.md` (root) and `packages/taskflow/CHANGELOG.md` both list `## [0.13.0] — 2026-05-29` above `## [0.12.0]`.

## Notes

- Versioning rationale: minor bump. N73 adds a new agent (additive) — no breaking schema, CLI, or config changes. N71 + N72 are visual/wording fixes. SemVer minor is correct.
- The pattern of "two changelogs" (root summary + `packages/taskflow/CHANGELOG.md` detail) is already established by 0.10.0–0.12.0. Do not collapse into one — consumers reading the root file expect the digest only.
- N69 (rejected) and N70 (already shipped in 0.12.0) are not in scope here. N70's "release v0.12.0" task is the structural template for this one — copy its shape.
- npm 2FA: if `npm publish` prompts for an OTP, surface the prompt to the human and pause; do not retry blindly.
- Consumer migration: existing projects must run `insight-flow init` (no `--force` required — init is additive) to pick up `.claude/commands/task-analyze.md`. The README and changelog both flag this.
- Related: N73 (the headline change), N71/N72 (the visual fixes), N70 (previous release task — same shape).
