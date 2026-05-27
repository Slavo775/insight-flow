# Changelog

All notable changes to `insight-flow` are documented here.

## [Unreleased]

## [0.8.0] — 2026-05-27

### Added

- **N46** — New `/config` dashboard page lists every option from `taskflow.config.json` with current values, types, and descriptions. Accessible via the top navigation bar.
- **N53** — `insight-flow init` now asks two interactive Y/n questions: whether to enable task lifecycle events (default yes) and whether to enable agent activity tracking (default no). Non-TTY environments receive the defaults automatically. Existing configs are respected on re-init.

### Changed

- **N50** — `prompt-build` now reads agent extension strings directly from `taskflow.config.json` (`agents.extend`). The separate `taskflow.prompt.json` sidecar file is no longer written or read; delete it if present in your project.
- **N51** — `insight-flow init` automatically runs `prompt-build --apply` so `AGENT_ENFORCEMENT.md` stays in sync with `taskflow.config.json` on every init without a separate manual step.
- **N52** — Browser desktop notifications now fire when Claude finishes a turn (agent done), replacing the previous per-status-transition model. One notification per completed agent session instead of one per task state change.
- **N54** — The repeated EVENTS block is extracted from all 8 agent role files into a single `AGENT_EVENTS.md`, referenced via `@AGENT_EVENTS.md`. Token load per agent run is reduced by ~120 words. `AGENT_PROTOCOL.md` sheds the duplicate `TOKEN EFFICIENCY`, `GIT RULE`, and `EXTENDING WITH PROJECT-SPECIFIC COMMANDS` sections.

### Docs

- **N49** — Project-wide documentation audit: stale references updated, missing sections filled, and accuracy verified across `CLAUDE.md`, `README.md`, role files, and architecture diagrams.

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

- **N34** — `activityEngine.enabled` now defaults to `false`. The activity feed, Claude status badge, sounds, and tab-title emoji are all gated behind this flag. Add `"activityEngine": { "enabled": true }` to `taskflow.config.json` to restore previous behaviour.

### Fixed

- **N24** — Hook registration format corrected for Claude Code `settings.json` schema (hooks array shape was rejected by the schema validator).

### Added

- **N25** — Shared top navigation bar across all dashboard pages (`/`, `/overview`) with project name and active-page highlight.
- **N26** — Strict event-type separation: activity events (human-readable feed items) vs typed hook events (machine-readable triggers). `activityEngine.enabled` is now the single gate for automation triggers.
- **N27** — Command hooks auto-emit `start`/`done` lifecycle events without manual `insight-flow log-event` calls. New `--if-active` flag for conditional hook execution; session events logged to a `.jsonl` file alongside the activity log.
- **N28** — Claude Code hook scripts bundled inside the package and installed during `insight-flow init`; lifecycle notification wiring included out of the box.
- **N29** — Activity tabs panel below the Kanban board: "Claude Activity" and "Recent Activity" panes with tab switching.
- **N33** — Unique event IDs (`evt_<timestamp>_<rand>`) on all hook events for client-side deduplication and dashboard action resolution.
- **N35** — Shared Claude status badge with three states: active (⚡), idle (💤), permission-needed (🚨) — rendered in the top nav and used as the tab-title prefix.
- **N36** — Sound notifications on agent-idle and permission-needed transitions (`/sounds/idle-ping.mp3`, `/sounds/permission-alert.mp3`). Per-browser opt-out toggle in the notification settings popover.
- **N37** — Browser tab title reflects Claude status with emoji prefix (⚡ / 💤 / 🚨); resets to plain title when status clears.
- **N38** — `notifications.sounds.enabled` config flag — project-level kill-switch for all dashboard sounds (default `true`). Overrides the per-browser checkbox when `false`.

### Changed

- **N30/N31/N32** — Activity feed items refactored to a shared wrapper component with consistent border-colour theming; duplicate rendering logic removed from Claude Activity and Recent Activity feeds.

### Docs

- **N23** — Architecture diagrams added: agent flow, server layout, notification pipeline, activity engine.

## [0.5.0] — 2026-05-23

### Breaking changes

- **N16** — `taskflow.prompt.json` schema slimmed: `gitTool` and `prStrategy` fields removed. They no longer gate prompt-build's substitution (the agent stack is now technology-agnostic). Consumers can either delete those keys or let `prompt-build` ignore them silently. This is the only schema breakage in this release.

### Fixed

- **N17** — Dashboard live-updates now use Socket.IO with automatic long-polling fallback, built-in 25 s heartbeat, and automatic reconnection. Real-browser support across Chrome and mobile Safari. Recursive `workTasks/` watcher with per-subdir Linux fallback and 100 ms debounce.
- **N18** — Activity panel detects hook installation status at boot and renders contextual empty-states (`hook-missing`, `settings-missing`, `both-missing`, and "Waiting for Claude activity — restart your Claude Code session" for the ok-but-empty case). New `insight-flow install-activity-hook` subcommand retrofits the hook into existing projects without re-running init; respects `activityEngine.enabled` with `--force` escape hatch.

### Added

- **N15** — `insight-flow show --id Nxx [--summary] [--spec]` for lean task lookups; `next --with-spec` / `next-review --with-spec` / `next-fix --with-spec` inline TASK.md + CHECKLIST.md content in the JSON response (saves agents two Read calls per task pick).
- **N15** — `REVIEW.md` is scaffolded by `review-start` from a template; Round-N reviews append `## Round N` blocks instead of overwriting.
- **N15** — `insight-flow stats --tokens` reports `tokensUsed` trends per task type/priority (min/median/p90/max/last-5-avg/all-time-avg).
- **N16** — `insight-flow init --examples` writes commented `agents.extend.<agent>: []` stubs into `taskflow.config.json`.
- **N19** — Browser + CLI notifications on task transitions. Dashboard fires the `Notification` API for watched status changes; new `insight-flow notify "<message>"` subcommand fires OS notifications independent of any browser tab (macOS / Linux / Windows). Both halves opt-out via `notifications.browser` and `notifications.cli` in `taskflow.config.json`.
- **N20** — `/overview` route aggregates multiple insight-flow servers into one page; reads `~/.insight-flow/projects.json`; per-project Socket.IO connections with live/reconnecting/down badges. Pairs with N19 so a transition on any project fires a project-labelled OS notification.
- **N21** — Richer activity feed: free hook enrichment (`UserPromptSubmit` → "Started /<skill>", `Stop` → "Completed", `PreToolUse` command classification) and cheap agent-side phase markers via the new `insight-flow log-activity "<message>" [--phase <name>]` subcommand. Both halves opt-out via `activityEngine.hookEnrichment` and `activityEngine.phaseMarkers` in `taskflow.config.json`.
- **N21** — Activity feed aside panel replaces the popup: collapsible, newest-first, 50-item cap, timestamps recomputed on every WebSocket tick. `activityEngine.verbosity` config (`"milestones"` | `"detailed"` | `"both"`) controls which event types are shown.
- **N21** — Master server (`insight-flow-master`) exposes `GET /api/activity/:projectName` returning the last 3 activity events; overview card shows active/idle state driven solely by `--phase done` events.

### Changed

- **N15** — Agent role docs compressed: shared skeleton extracted into `AGENT_PROTOCOL.md`; every role file trimmed to ≤ 40 lines. Saves ~400–600 tokens per slash-command invocation.
- **N16** — Agent prompts are now **technology-agnostic**. Project-specific commands belong in `taskflow.config.json.agents.extend.<agent>` — the canonical extension point.
- **N16** — `GITHUB_PR_API.md` renamed to `PR_API.md`; host-agnostic body with GitHub REST, GitLab REST, and no-CLI fallback examples.
- **N21** — Runtime dependency added: `socket.io ^4.8.x` (replaces hand-rolled WebSocket implementation from 0.4.x). Ships as a transitive dependency — consumers do not need to install it directly.

### Tests

- **N15** — `test/scaffold-and-bundle.test.mjs` covers `create` template scaffold, `review-start` first/Round-N scaffold, `next --with-spec`, `show --summary --spec`, `stats --tokens`.
- **N16** — `test/no-technology-tight.test.mjs` greps every canonical prompt file for forbidden literal-technology patterns. Total suite: **15+ tests pass**.
- **N21** — `test/log-activity.test.mjs` and `test/log-activity-done.test.mjs` cover the `log-activity` subcommand with `phaseMarkers` on/off.

### Docs

- **N16** — `CLAUDE.md` "Extending agents with project-specific commands" section with worked examples (TS+pnpm+GitHub, Python+uv+GitLab, Go+GitHub).
- **N21** — README "Activity feed enrichment" section: free hooks, CLI subcommand, three config toggles (`hookEnrichment`, `phaseMarkers`, `verbosity`), done-event idle convention, master server endpoint.

## [0.4.0] — 2026-05-21

### Breaking changes

- None.

### Features

- **N07** — Zod schema validation on all taskflow storage read/write paths. Invalid task data now throws `TaskflowValidationError` instead of silently corrupting the tracker.
- **N08** — Role definition files (`TASK_*_ROLE.md`) are now bundled inside the package and scaffolded to `.claude/roles/` by `insight-flow init`. No manual copying required.
- **N12** — `agents.extend` in `taskflow.config.json`: inject project-specific rules into built-in agent role files. Re-running `init` replaces (never duplicates) the `## Project Extensions` section.
- **N12** — `agents.custom` in `taskflow.config.json`: register new Claude Code skills from config. Generates `.claude/commands/<name>.md` with `@AGENT_ENFORCEMENT.md` reference and adds rows to CLAUDE.md's skills table.
- **N12** — JSON schema for `taskflow.config.json` shipped at `schema/taskflow.config.schema.json` with `additionalProperties: false` and enum validation on built-in agent names.

### Improvements

- **N05** — Role files migrated out of `scripts/` into the `insight-flow` binary. `scripts/task-tracker.mjs` deleted; the CLI is the single entry point.
- **N06** — `packages/taskflow` is now the single source of truth for all CLI logic. Duplicate code removed from the project root.
- **N09** — Vite UI build standardised; output consistently lands in `dist/ui/`.
- **N10** — Binary path resolution is now project-root relative. `insight-flow` commands work correctly when invoked from any subdirectory of the project.
- **N11** — Agent roles now enforce CLI-only mutations. `gh` and `git` permissions wired into `AGENT_ENFORCEMENT.md` so agents can perform git operations without manual permission prompts.

---

## [0.3.1] and earlier

See git history.
