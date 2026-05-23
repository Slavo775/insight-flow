# N22 — Release insight-flow v0.5.0 with N17 N18 plus N19 N20 N21 features

**Type:** rework
**Priority:** high
**Created:** 2026-05-23

## Problem

The N17 + N18 fixes already on main (Socket.IO live updates, recursive watcher, activity panel UX) plus the three feature tasks (N19 notifications, N20 multi-project overview, N21 richer activity feed) together represent a coherent step up from `insight-flow@0.4.0` — they touch the published runtime contract (new `socket.io` dependency, two new subcommands, three new hooks, new config keys). Consumers will not benefit until a tagged release is published to npm. This task cuts that release: version bump, CHANGELOG, publish, tag, GitHub release, README highlight.

## Goal

1. `insight-flow@0.5.0` is published on npm and reachable via `npx insight-flow@0.5.0 --version`.
2. CHANGELOG.md exists at the repo root (Keep-a-Changelog format) with sections for **Fixed**, **Added**, **Changed** covering N17 / N18 / N19 / N20 / N21.
3. Git tag `v0.5.0` exists on the release commit and is pushed to origin.
4. GitHub release page exists at `v0.5.0` referencing the CHANGELOG.md entry.
5. README has a "0.5.0 highlights" callout near the top so consumers see the upgrade reason at a glance.

## Scope

### In scope

- `packages/taskflow/package.json` — bump `version` to `0.5.0` (or higher if scope grew).
- `CHANGELOG.md` (top-level, new file) — Keep-a-Changelog format. Section template below.
- `packages/taskflow/README.md` — add a "0.5.0 highlights" callout near the top.
- Release artifacts: `git tag v0.5.0`, `git push origin v0.5.0`, GitHub release via `gh release create v0.5.0 --notes-file CHANGELOG.md` or equivalent.
- npm publish via the project's existing flow (`pnpm --dir packages/taskflow publish --access public` per the package's npm scope; double-check the user is logged in before running).

### Out of scope

- N19 / N20 / N21 implementation work — must already be merged to main before this task starts.
- Migrating the `playground/` workspace to 0.5.0 (it imports the local package via workspace alias).
- Breaking changes to any v0 API surface (this is additive on top of 0.4.0).
- Backporting fixes to a hypothetical 0.4.x maintenance line (there isn't one).

## Implementation plan

1. **Pre-flight.**
   - Ensure N19, N20, N21 are all `merged` on main via `node packages/taskflow/dist/cli.js show --id Nxx --summary`.
   - On a clean main: `git pull origin main && git status` shows nothing.
2. **Version bump.**
   - Edit `packages/taskflow/package.json` `version: "0.4.0"` → `"0.5.0"`.
   - Commit: `chore(release): bump version to 0.5.0`.
3. **CHANGELOG.md.**
   - Create at repo root (or append if it already exists). Format:
     ```
     # Changelog

     ## [0.5.0] - 2026-XX-XX

     ### Fixed
     - N17 — Dashboard live-updates now use Socket.IO with auto fallback to long-polling, built-in 25 s heartbeat, and automatic reconnection. Real-browser support across Chrome and mobile Safari. Recursive workDir watcher with per-subdir Linux fallback and 100 ms debounce.
     - N18 — Activity panel detects hook installation status at boot and renders contextual empty-states (`hook-missing`, `settings-missing`, `both-missing`, and "Waiting for Claude activity — restart your Claude Code session" for the ok-but-empty case). New `insight-flow install-activity-hook` subcommand retrofits the hook into existing projects without re-running init; respects `activityEngine.enabled` with `--force` escape hatch.

     ### Added
     - N19 — Browser + CLI notifications on task transitions. Dashboard fires `Notification` API for watched status changes; new `insight-flow notify "<message>"` subcommand fires OS notifications independent of any browser tab (macOS / Linux / Windows). Both halves opt-out via `notifications.browser` and `notifications.cli` in `taskflow.config.json`.
     - N20 — `/overview` route aggregates multiple insight-flow servers into one page; reads `~/.insight-flow/projects.json`; per-project Socket.IO connections with live/reconnecting/down badges. Pairs with N19 so a transition on any project fires a project-labelled OS notification.
     - N21 — Richer activity feed: free hook enrichment (UserPromptSubmit "Started /<skill>", Stop "Completed", PreToolUse command classification) and cheap agent-side phase markers via the new `insight-flow log-activity` subcommand. Both halves opt-out via `activityEngine.hookEnrichment` and `activityEngine.phaseMarkers` in `taskflow.config.json`.

     ### Changed
     - Runtime dependency added: `socket.io ^4.8.x` (was a hand-rolled WebSocket implementation in 0.4.x). Consumers do not need to install it directly — it ships as a transitive dependency of `insight-flow`.
     ```
   - Commit: `docs(changelog): add 0.5.0 entry`.
4. **README highlights.**
   - Insert a "0.5.0 highlights" callout block near the top of `packages/taskflow/README.md` (just after the badges / install instructions). Three bullet points summarising the most consumer-facing wins (reliable live updates, notifications, multi-project overview).
   - Commit: `docs(readme): 0.5.0 highlights callout`.
5. **Quality gates on the release commit.**
   - `pnpm --dir packages/taskflow run typecheck`
   - `pnpm --dir packages/taskflow run build`
   - `pnpm --dir packages/taskflow test`
   - Manual smoke: start the dashboard against the playground workspace, confirm Socket.IO + notifications + overview + phase markers all work end-to-end.
6. **npm publish.**
   - Verify `npm whoami` resolves to a publisher account.
   - `pnpm --dir packages/taskflow publish --access public` (or the project's canonical publish flow).
   - Confirm: `npx insight-flow@0.5.0 --version` from a fresh tmp dir prints `0.5.0`.
   - Confirm: `npx insight-flow@0.5.0 init` in a fresh repo succeeds and installs all four hooks (PostToolUse + UserPromptSubmit + Stop + PreToolUse from N21).
7. **Tag + GitHub release.**
   - `git tag v0.5.0`
   - `git push origin v0.5.0`
   - `gh release create v0.5.0 --notes-file CHANGELOG.md --title "v0.5.0 — Reliable live updates, notifications, multi-project overview"`.

## Verification

- `npx insight-flow@0.5.0 --version` from a clean tmp dir prints `0.5.0`.
- `npx insight-flow@0.5.0 init` in a fresh repo succeeds; resulting `.claude/settings.local.json` contains four PostToolUse / UserPromptSubmit / Stop / PreToolUse entries; `taskflow.config.json` contains the new `notifications` and `activityEngine.phaseMarkers` / `hookEnrichment` keys.
- GitHub release page `https://github.com/Slavo775/insight-flow/releases/tag/v0.5.0` exists with full CHANGELOG copy.
- `pnpm view insight-flow versions` lists `0.5.0`.

## Notes

- All token-spending features (N19's CLI half, N21's phase markers) are opt-out at the config level. The release notes should explicitly mention the token-cost knobs so token-conscious projects can flip them off.
- If a defect surfaces during the smoke phase, open a `fix` task before publishing — never publish a broken `latest`.
- This is the first release that adds a third-party runtime dependency to `insight-flow`. Worth noting in the README upgrade-path section.
- Tag commit should be the one that bumps `package.json` to `0.5.0` (the npm tarball is built from that commit).
