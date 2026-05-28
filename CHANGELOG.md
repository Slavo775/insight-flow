# Changelog

All notable changes to `insight-flow` are documented here.
Full history lives in [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md).

## [Unreleased]

## [0.12.0] — 2026-05-28

### Added

- **N68** — Central `POST /log/events` endpoint, in-memory `EventStore`, and a four-state project status model (`active` / `awaiting-permission` / `idle` / `done`) derived from hook events. New WebSocket `status` frames drive the dashboard pill, sounds (only on `→ done` / `→ awaiting-permission`), and a per-browser "Browser notifications" toggle gated by `document.hasFocus()`. Master overview receives the same status pushes from each project server.

See [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md) for the full entry.

## [0.11.2] — 2026-05-28

### Fixed

- **N67** — Hook scripts use `${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>` instead of bare relative paths. Re-run `insight-flow init` after upgrading.

See [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md) for the full entry.

## [0.11.1] — 2026-05-28

### Changed

- **N66** — `batch-init` renamed to `bulk-init`; `batch-prompt-build` renamed to `bulk-prompt-build`. Behaviour unchanged.

See [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md) for the full entry.

## [0.11.0] — 2026-05-28

### Added

- **N64** — `batch-ui --init [--force] [--examples]` runs `insight-flow init` in all (or interactively selected) registered batch-ui projects. Useful after upgrading insight-flow to re-scaffold role files across every consumer project in one command.
- **N64** — `batch-ui --prompt-build` runs `insight-flow prompt-build --apply` in all (or selected) registered projects. The canonical post-release workflow: after `npm install -g insight-flow@latest`, run `insight-flow batch-ui --prompt-build` to sync `AGENT_ENFORCEMENT.md` and role extensions everywhere.

### Fixed

- **N64** — `prompt-build --apply` now writes `AGENT_ENFORCEMENT.md` into `config.rolesDir` (e.g. `.claude/roles/`) instead of the project root when the project's role files live there. Consumer projects initialised with `insight-flow init` now get the enforcement file co-located with their role files so `@AGENT_ENFORCEMENT.md` references resolve correctly.

See [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md) for the full entry.

## [0.10.0] — 2026-05-28

### Security

- **N59** — `AGENT_SECURITY.md` added at repo root with prompt-injection guardrail rules covering hidden-instruction suppression, URL exfiltration, action hijacking, and persona override. Imported via `AGENT_ENFORCEMENT.md` so all 8 agents receive the guardrails without individual edits. Synced to `packages/taskflow/templates/roles/AGENT_SECURITY.md`.

### Fixed

- **N60** — Master registry no longer generates a new UUID on every re-registration; project cards deduplicate correctly when a server restarts.
- **N61** — Overview grid uses equal-width columns (`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`) with a single-column fallback below 400 px viewport width.
- **N62** — `/sounds/` endpoint restored with explicit `Content-Length` header. `playStatusSound()` tries the mp3 via a `HEAD` check first; falls back to Web Audio API tones when no file is present or file is empty. Placeholder `idle-ping.mp3` and `permission-alert.mp3` shipped in package.

See [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md) for the full entry.

## [0.7.0] — 2026-05-26

### Fixed

- **N40** — Master server upserts registrations by project ID instead of appending duplicates; eliminates ghost entries after server restarts.
- **N43** — Dashboard sounds no longer replay on socket reconnect. Historical idle/permission-needed events from the snapshot are suppressed; only live events trigger audio.

### Added

- **N41** — Master overview cards reflect real-time Claude session status (active / idle / permission-required) with solid colour-coded card backgrounds and a text badge. Project server pushes status fire-and-forget on activity events; initial `idle` push happens immediately after registration.
- **N42** — `agents.git.permissions` config block (9 boolean flags: `createBranch`, `checkout`, `commit`, `push`, `forcePush`, `merge`, `deleteBranchLocal`, `deleteBranchRemote`, `createPR`) lets projects block specific git operations while keeping others enabled. `task-git` reads the block on every run and prints a clear blocked message naming the exact config key to change. `insight-flow init` scaffolds the full block with safe defaults (`forcePush: false`, rest `true`). Protocol documented in `AGENT_CONFIG.md`.
- **N47** — `remoteOps: "allow" | "deny"` shorthand added to `agents.git.permissions`. Setting `"deny"` blocks all origin-touching ops (`push`, `forcePush`, `deleteBranchRemote`, `createPR`) at once; individual boolean flags override the shorthand. `resolveConfig()` applies the shorthand post-merge so resolved config and dashboard both reflect the effective values. `AGENT_CONFIG.md` updated with equivalent runtime logic for `task-git`.

### Docs

- **N48** — `packages/taskflow/README.md` rewritten: `## Install` + `## Quickstart` replaced with a 6-step `## Getting started` guide (`### What init creates` table lists all scaffolded paths); `## Configuration` expanded to a complete reference covering all 22 config fields across `TaskflowConfig`, `ActivityEngineConfig`, `NotificationsConfig`, `MasterConfig`, and `EventsConfig`.

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
- **N33** — Unique event IDs on all hook events for deduplication.
- **N35** — Shared Claude status badge: active (⚡), idle (💤), permission-needed (🚨) — in top nav and tab title.
- **N36** — Sound notifications on agent-idle and permission-needed. Per-browser toggle in notification settings.
- **N37** — Browser tab title reflects Claude status with emoji prefix.
- **N38** — `notifications.sounds.enabled` config flag — project-level sound kill-switch (default `true`).

### Changed

- **N30/N31/N32** — Activity feed items refactored to a shared wrapper; consistent styling across both activity panes.

### Docs

- **N23** — Architecture diagrams: agents, server, notifications, activity engine.

See [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md) for the full entry.

## [0.5.0] — 2026-05-23

### Breaking changes

- **N16** — `taskflow.prompt.json` schema slimmed: `gitTool` and `prStrategy` fields removed. They no longer gate prompt-build's substitution (the agent stack is now technology-agnostic). Consumers can either delete those keys or let `prompt-build` ignore them silently. This is the only schema breakage in this release.

### Fixed

- **N17** — Dashboard live-updates now use Socket.IO with automatic long-polling fallback, built-in 25 s heartbeat, and automatic reconnection. Real-browser support across Chrome and mobile Safari. Recursive `workTasks/` watcher with per-subdir Linux fallback and 100 ms debounce.
- **N18** — Activity panel detects hook installation status at boot and renders contextual empty-states. New `insight-flow install-activity-hook` subcommand retrofits the hook into existing projects without re-running init.

### Added

- **N19** — Browser + CLI notifications on task transitions. Dashboard fires the `Notification` API for watched status changes; `insight-flow notify "<message>"` fires OS notifications (macOS / Linux / Windows). Opt-out via `notifications.browser` and `notifications.cli`.
- **N20** — `/overview` route aggregates multiple insight-flow servers into one page; reads `~/.insight-flow/projects.json`; per-project Socket.IO connections with live/reconnecting/down badges.
- **N21** — Richer activity feed: free hook enrichment (`UserPromptSubmit`, `Stop`, `PreToolUse`) and phase markers via `insight-flow log-activity "<message>" [--phase <name>]`. Both halves opt-out via `activityEngine.hookEnrichment` and `activityEngine.phaseMarkers`.
- **N21** — Activity feed aside panel: collapsible, newest-first, 50-item cap, timestamps refresh on every WebSocket tick. `activityEngine.verbosity` controls visible event types.
- **N15** — `insight-flow show --id Nxx [--summary] [--spec]` and `next --with-spec` for lean task lookups.
- **N15** — `insight-flow stats --tokens` reports token-usage trends per task type/priority.

### Changed

- **N21** — Runtime dependency added: `socket.io ^4.8.x` (replaces hand-rolled WebSocket from 0.4.x). Ships as a transitive dependency.
- **N16** — Agent prompts are now technology-agnostic; project-specific commands live in `taskflow.config.json.agents.extend.<agent>`.

## [0.4.0] — 2026-05-21

See [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md) for the full 0.4.0 entry.
