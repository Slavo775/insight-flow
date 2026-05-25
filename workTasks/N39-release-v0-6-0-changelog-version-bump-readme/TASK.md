# N39 — Release v0.6.0 — changelog, version bump, README

**Type:** chore
**Priority:** high
**Created:** 2026-05-25

## Problem

No release has been cut since v0.5.1 (N22). Tasks N23–N38 are all merged — 16 tasks including a breaking change (N34: `activityEngine.enabled` defaults to `false`), major UX additions (Claude status badge, sounds, tab title, activity tabs), and new config keys (`notifications.sounds`). The changelog, version, and README are all still at 0.5.x.

## Goal

1. Bump version to `0.6.0` in `packages/taskflow/package.json`.
2. Write the `[0.6.0]` entry in both `CHANGELOG.md` files covering N23–N38.
3. Update "What's new" in `packages/taskflow/README.md` to 0.6.0; fix "bundled React dashboard" (it is server-rendered vanilla JS).
4. Update root `README.md` config table to document `activityEngine` and `notifications.sounds`; fix "live-reloads via SSE" (it is Socket.IO since 0.5).
5. Build passes after version bump.

## Scope

### In scope

- `packages/taskflow/package.json` — `"version": "0.5.1"` → `"0.6.0"`.
- `packages/taskflow/CHANGELOG.md` — prepend `[0.6.0]` section above `[0.5.0]`.
- `CHANGELOG.md` (root) — prepend `[0.6.0]` section above `[0.5.0]`.
- `packages/taskflow/README.md` — update "What's new" block; fix "React dashboard" description.
- `README.md` (root) — fix SSE mention; add `activityEngine.enabled` and `notifications.sounds.enabled` to config table.

### Out of scope

- npm publish (manual step post-merge).
- Git tag creation.
- Any source code changes.
- `CLAUDE.md`, role files, schema files, `taskflow.config.json`.

## Implementation plan

1. **Bump version** (`packages/taskflow/package.json`)
   - `"version": "0.5.1"` → `"version": "0.6.0"`.

2. **Write `[0.6.0]` CHANGELOG entry** in `packages/taskflow/CHANGELOG.md` (prepend above `[0.5.0]`):
   ```
   ## [0.6.0] — 2026-05-25

   ### Breaking changes
   - **N34** — `activityEngine.enabled` now defaults to `false`. Add `"activityEngine": { "enabled": true }` to `taskflow.config.json` to restore previous behaviour.

   ### Fixed
   - **N24** — Hook registration format corrected for Claude Code settings schema.

   ### Added
   - **N25** — Shared top navigation bar across all dashboard pages.
   - **N26** — Strict event-type split: activity events vs typed hook events; `activityEngine.enabled` required for automation triggers.
   - **N27** — Command hooks auto-emit lifecycle events without manual `insight-flow log-event` calls. New `--if-active` flag; session events logged to `.jsonl`.
   - **N28** — Claude Code hook scripts bundled and installed during `insight-flow init`.
   - **N29** — Activity tabs panel below Kanban board: "Claude Activity" and "Recent Activity" panes.
   - **N33** — Unique event IDs (`evt_<ts>_<rand>`) on all hook events for deduplication.
   - **N35** — Shared Claude status badge: active (⚡), idle (💤), permission-needed (🚨) — in top nav and tab title.
   - **N36** — Sound notifications on agent-idle and permission-needed. Per-browser toggle in settings.
   - **N37** — Browser tab title reflects Claude status with emoji prefix.
   - **N38** — `notifications.sounds.enabled` config flag — project-level sound kill-switch (default `true`).

   ### Changed
   - **N30/N31/N32** — Activity feed items refactored to a reusable wrapper; consistent styling across both activity panes.

   ### Docs
   - **N23** — Architecture diagrams: agents, server, notifications, activity engine.
   ```

3. **Update root `CHANGELOG.md`** — prepend a matching `[0.6.0]` section above `[0.5.0]` with the same content (or a brief summary pointing to the package changelog).

4. **Update `packages/taskflow/README.md`**
   - Line 3: `"bundled React dashboard"` → `"server-rendered dashboard (vanilla JS)"`.
   - Replace the `## What's new in 0.5.0` block with `## What's new in 0.6.0` listing: breaking change (N34), Claude status badge (N35), sounds (N36), tab title (N37), activity tabs (N29), sounds config flag (N38).

5. **Update root `README.md`**
   - Dashboard section bullet: `"live-reloads via SSE"` → `"live-reload via Socket.IO (auto-reconnect, long-polling fallback)"`.
   - Config table: add two rows:
     - `activityEngine.enabled` | `false` | Enables Claude activity feed, sounds, and tab-title status
     - `notifications.sounds.enabled` | `true` | Project-level kill-switch for all dashboard sounds

6. **Build** — `pnpm --dir packages/taskflow run build` must exit 0.

## Verification

- `grep '"version"' packages/taskflow/package.json` → `"0.6.0"`.
- `head -5 packages/taskflow/CHANGELOG.md` contains `## [0.6.0]`.
- `head -10 CHANGELOG.md` contains `## [0.6.0]`.
- `packages/taskflow/README.md` contains "What's new in 0.6.0" and no longer says "React dashboard".
- `README.md` no longer contains "via SSE"; config table contains `activityEngine.enabled`.
- `pnpm --dir packages/taskflow run build` exits 0.

## Notes

- N23 (architecture diagrams) is docs-only — one "Docs" bullet in changelog, no config/code to call out.
- The "React dashboard" claim in `packages/taskflow/README.md` is a pre-existing inaccuracy (server-rendered since ≥ 0.4.x).
- N34 is the only breaking change in this release.
- N30/N31/N32 are internal refactors — grouped into one "Changed" bullet.
