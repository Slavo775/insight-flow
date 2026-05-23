# Changelog

All notable changes to `insight-flow` are documented here.
Full history lives in [`packages/taskflow/CHANGELOG.md`](packages/taskflow/CHANGELOG.md).

## [Unreleased]

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
