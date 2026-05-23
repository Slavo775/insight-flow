# Changelog

All notable changes to `insight-flow` are documented here.

## [Unreleased]

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
