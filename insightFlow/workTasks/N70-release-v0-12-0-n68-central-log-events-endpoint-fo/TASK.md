# N70 — release v0.12.0 — N68 central /log/events endpoint + four-state status model

**Type:** feat
**Priority:** medium
**Created:** 2026-05-28

## Problem

The current published version of `insight-flow` is **0.11.2**. Since then, N68 has landed on `main` (merge `35b6602`) introducing the central `POST /log/events` endpoint, the four-state project status model (`active` / `awaiting-permission` / `idle` / `done`), the in-memory `EventStore`, status WebSocket frames, browser notifications, and the daily JSONL backup. Consumers cannot use any of this until a new npm release ships. Additionally, the repo-root `CHANGELOG.md` is still pinned at 0.11.0 (never updated for 0.11.1 or 0.11.2), so it must catch up at the same time. N69 was abandoned; its only artefact in `main` is the `workTasks/N69-...` task record — no code shipped, so it does not affect this release.

## Goal

1. Cut **v0.12.0** of the `insight-flow` npm package — minor bump justified by N68's new public surface (HTTP endpoint, schemas, WebSocket frames, dashboard wiring).
2. Backfill `CHANGELOG.md` (repo root) with the 0.11.1, 0.11.2 entries it's missing AND the new 0.12.0 entry.
3. Add the 0.12.0 entry to `packages/taskflow/CHANGELOG.md` (currently has an empty `[Unreleased]` section ready to fill).
4. Refresh `packages/taskflow/README.md` for any new commands / config keys / behaviour shipped by N68 (event endpoint, status model, browser notifications + per-browser toggle, master overview status pushes).
5. Publish to npm and tag the release.

## Scope

### In scope

- `packages/taskflow/package.json` — bump `version` to `0.12.0`.
- `packages/taskflow/CHANGELOG.md` — replace `## [Unreleased]` placeholder with `## [0.12.0] — 2026-05-28` entry listing N68 changes; keep a fresh empty `[Unreleased]` above it.
- `CHANGELOG.md` (repo root) — catch up with `[0.11.1]`, `[0.11.2]` (one-liners referencing the per-package entries) and add `[0.12.0]`.
- `packages/taskflow/README.md` — document any new commands and runtime behaviour from N68 (POST `/log/events`, four-state status model, browser-notification toggle, daily JSONL backup at `workTasks/.events/<YYYY-MM-DD>.jsonl`). Only edit sections where the surface actually changed.
- `pnpm pack:taskflow` to produce the tarball, smoke-install it, then `npm publish` from `packages/taskflow/`.
- Tag and push: `git tag insight-flow@0.12.0 && git push origin insight-flow@0.12.0` (match the tag style of prior releases — check `git tag --list 'insight-flow@*'` first; if no tag style exists, use `v0.12.0`).

### Out of scope

- N69 — abandoned, no code in `main`. Mention in changelog only as "tried-and-rejected approach; no shipped change".
- `packages/insight-flow-master` — not published from this release; if its dist is built locally for the project server, fine, but no version bump or publish.
- Bumping the playground or any other workspace package version.
- New features. This is a release-only task — no behavioural changes beyond what N68 already merged.

## Implementation plan

1. **Inventory the unreleased surface.**
   - `git log --oneline 60b66e1..HEAD -- packages/taskflow/` to see every commit since the last tracker-flush.
   - Confirm the merged N68 work: `git log --oneline d7f3ba4` shows the feat commit; `git log --oneline 35b6602` the merge.
   - Walk `packages/taskflow/src/server/index.ts` (POST `/log/events`, GET `/log/status`, master forwarder), `event-stream.ts`, schema additions, dashboard.ts changes, hook template changes.

2. **Bump version.**
   - Edit `packages/taskflow/package.json`: `"version": "0.12.0"`.
   - No other version locations exist in the workspace (verify with `grep -rn '"version"' packages/taskflow/` excluding `node_modules`).

3. **Update `packages/taskflow/CHANGELOG.md`.**
   - Replace the empty `## [Unreleased]` with `## [Unreleased]\n\n## [0.12.0] — 2026-05-28`.
   - Under 0.12.0 add `### Added`:
     - **N68** — `POST /log/events` endpoint (validated via Zod schema), with daily JSONL backup at `workTasks/.events/<YYYY-MM-DD>.jsonl`.
     - **N68** — Four-state project status model (`active` / `awaiting-permission` / `idle` / `done`) derived in-memory via `EventStore`; `GET /log/status` returns current status + recent events.
     - **N68** — WebSocket `status` frame broadcast on transitions; dashboard pill + sound (`→ done` / `→ awaiting-permission` only) + per-browser notification toggle (localStorage) + permission request button.
     - **N68** — Master overview now receives status pushes from each project server (project UUID lookup unchanged from N20).
   - Add `### Changed` if anything pre-existing was modified (existing hook scripts now also POST to `/log/events`).
   - Add `### Notes`: "N69 (`stateful status transitions`) was scoped, prototyped, and rejected after live evaluation — no code ships in this release; the task folder is retained as `workTasks/N69-...` for history."

4. **Update repo-root `CHANGELOG.md`.**
   - Add catch-up entries for 0.11.1 (N66 rename) and 0.11.2 (N67 hook-path fix) — one-line each, pointing to the per-package CHANGELOG for detail.
   - Add a 0.12.0 entry mirroring the per-package summary.

5. **Refresh `packages/taskflow/README.md`.**
   - If a "Server" / "Hooks" / "Status model" section exists, update it. If not, add a brief section after the existing CLI command table.
   - Document the four statuses, the `POST /log/events` payload shape, and the per-browser "Browser notifications" toggle.
   - Do NOT rewrite untouched sections — minimal surgical edits.

6. **Sync role templates + final build.**
   - `pnpm --dir packages/taskflow run sync-roles` (re-syncs `packages/taskflow/templates/roles/` from canonical root files).
   - `pnpm --dir packages/taskflow run build` and `pnpm --dir packages/taskflow run typecheck`.
   - `pnpm --dir packages/taskflow test` — full suite green.

7. **Pack and smoke-install.**
   - `pnpm pack:taskflow` from repo root → produces `insight-flow-0.12.0.tgz`.
   - In a scratch dir: `mkdir /tmp/if-smoke && cd /tmp/if-smoke && npm i /full/path/to/insight-flow-0.12.0.tgz && ./node_modules/.bin/insight-flow --version` → expect `insight-flow 0.12.0`.
   - Optionally: `./node_modules/.bin/insight-flow init` in the scratch dir to confirm scaffolding still works.

8. **Publish + tag.**
   - From `packages/taskflow/`: `npm publish` (uses the existing `prepublishOnly` chain — sync-roles + build + typecheck — so this re-validates everything).
   - Tag: `git tag insight-flow@0.12.0 && git push origin insight-flow@0.12.0` (or `v0.12.0` if the prior style differs — verify with `git tag --list`).

9. **Commit the release artefacts.**
   - One `chore(release): v0.12.0` commit on `main` containing the version bump + both CHANGELOG updates + README. Push to `origin/main`.

## Verification

- `npm view insight-flow version` (after publish) returns `0.12.0`.
- `npx insight-flow@0.12.0 --version` from anywhere → `insight-flow 0.12.0`.
- Repo-root CHANGELOG.md has entries for 0.11.1, 0.11.2, 0.12.0.
- `packages/taskflow/CHANGELOG.md` has an empty `[Unreleased]` above the new `[0.12.0]` entry.
- `git tag --list 'insight-flow@*'` (or `v*`) includes the new tag and it's on origin.
- `pnpm --dir packages/taskflow run prepublishOnly` succeeds (the publish would have re-run it).
- Smoke install from the local tarball runs `insight-flow --version` cleanly.

## Notes

- The user explicitly asked the agent to "take care of publish" — npm publish requires interactive 2FA in most setups. If the publish step blocks on auth, surface the prompt to the user; do not bypass.
- Repo-root scripts: `pnpm pack:taskflow` is the canonical pack command per `CLAUDE.md`.
- `agents.extend.task-implement` adds: "Run `pnpm typecheck` before marking implemented" (per the project `taskflow.config.json`) — already covered in step 6.
- Prior release task (N65 → v0.11.0) is the closest template: see `workTasks/N65-release-v0-11-0-*/` for the format the project expects. Mirror its style for this task's REVIEW.md when the time comes.
- The `Hooks: installed v0 < bundled v2` warning surfaced by the running server on startup is unrelated to this release (separate `insight-flow migrate-hooks` flow); flag it only if a user reports confusion post-release.
