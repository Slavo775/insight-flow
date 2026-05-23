# N21 — Richer activity feed — Checklist

## Done criteria

### Config
- [ ] `activityEngine.phaseMarkers: boolean` (default `true`) in `TaskflowConfig`.
- [ ] `activityEngine.hookEnrichment: boolean` (default `true`) in `TaskflowConfig`.
- [ ] `activityEngine.verbosity: "milestones" | "detailed" | "both"` (default `"both"`) in `TaskflowConfig`.

### Free hooks
- [ ] `UserPromptSubmit` hook emits "Started /<skill>" events.
- [ ] `Stop` hook emits "Completed /<skill>" events.
- [ ] `PreToolUse` hook classifies common commands (`pnpm test`, `git commit`, `git push`, `gh pr create`, `pnpm build`, etc.) with friendly labels.
- [ ] `insight-flow init` installs all three new hooks alongside the existing PostToolUse hook and registers them in `.claude/settings.local.json`.
- [ ] When `activityEngine.hookEnrichment: false`, the three new hooks are not generated (PostToolUse hook untouched).

### `log-activity` subcommand
- [ ] New `insight-flow log-activity "<message>"` subcommand exists with `--phase <name>`.
- [ ] Subcommand exits in < 100 ms; appends a single JSONL line with `tool: "Phase"`; swallows errors.
- [ ] When `activityEngine.phaseMarkers: false`, subcommand exits 0 silently and writes nothing.
- [ ] `--phase done` produces `{ action: "done" }` in the JSONL line.

### Dashboard aside panel
- [ ] "Claude Activity" popup replaced by a collapsible `<aside>` panel (expanded by default).
- [ ] Collapse/expand toggle persists to `localStorage` (`activityPanelCollapsed`) and is restored on page load.
- [ ] Activity feed renders newest-first (most recent event at the top).
- [ ] Feed is capped at 50 items; excess entries are trimmed from the tail on every update.
- [ ] On every WebSocket message, all visible activity timestamps are recomputed (`timeAgo(ev.ts)`), not only the new entry.
- [ ] `verbosity: "milestones"` hides raw Tool events in the panel.
- [ ] `verbosity: "detailed"` hides Phase + Skill events in the panel.
- [ ] `verbosity: "both"` shows all event types.
- [ ] `Phase` events render with accent badge, bold message, no file path.
- [ ] `Skill` events render with secondary badge + started/completed verb.
- [ ] `Tool` events with a `label` field render friendly label as primary + muted raw command as secondary.
- [ ] Unclassified events fall back to existing bare tool + file rendering.

### Master server activity endpoint
- [ ] `GET /api/activity/:projectName` on the master server returns `{ project, events: ActivityEvent[] }` (last 3 events).
- [ ] Returns 404 for unknown projects; 200 with empty events if `.taskflow-activity.jsonl` not found.
- [ ] Multi-project overview card displays the last 3 activity events below the project status badge.

### Active / idle state
- [ ] Overview card shows **active** badge when any activity event is present in the current session.
- [ ] Overview card shows **idle** badge only when the latest Phase event has `action: "done"`.
- [ ] Overview card shows no badge (neutral) when no activity events exist for the project.
- [ ] Idle is never set by timeout or inference — only by the `done` Phase event.

### Agent role files
- [ ] All 9 canonical role files have a "PHASE MARKERS" section with 6 recommended calls: start, research-start, research-end (with output summary), edit-start, edit-end (with output summary), done.
- [ ] `insight-flow init` strips the "PHASE MARKERS" section from per-project role-file copies when `activityEngine.phaseMarkers: false`.

### Docs
- [ ] README documents free hooks, CLI subcommand, all three config toggles, done-event idle convention, verbosity modes, and master server endpoint.

### Changelog + release
- [ ] `packages/taskflow/CHANGELOG.md` has a `## [0.5.0] — <date>` section covering N17–N21 (live updates, activity UX, notifications, multi-project overview, richer feed / phase markers / hook enrichment).
- [ ] Existing `[Unreleased]` content promoted to `[0.5.0]`; new blank `[Unreleased]` stub added above it.
- [ ] `packages/taskflow/package.json` `"version"` bumped to `"0.5.0"`.
- [ ] `pnpm --dir packages/taskflow run build` passes cleanly before publish.
- [ ] `pnpm publish --access public` (run from `packages/taskflow/`) succeeds.
- [ ] `npm view insight-flow version` returns `0.5.0`.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes.
- [ ] `pnpm --dir packages/taskflow run build` passes.
- [ ] `pnpm --dir packages/taskflow test` passes (existing + new `log-activity.test.mjs` + `log-activity-done.test.mjs`).
- [ ] No regression in `insight-flow ui` startup time.

## Verification

- [ ] Manual A: fresh Claude Code session → `/task-implement N99` → aside panel shows phase markers newest-first, timestamps stay fresh on every WS tick, max 50 items enforced.
- [ ] Manual B: `phaseMarkers: false` → re-init → role-file copies omit PHASE MARKERS, no Phase entries in feed.
- [ ] Manual C: `hookEnrichment: false` → re-init → only PostToolUse hook installed, no classification labels.
- [ ] Manual D: `verbosity: "milestones"` → only Phase + Skill events visible.
- [ ] Manual E: master server `/api/activity/:projectName` returns last 3 events; overview card idle badge appears only after done event, not before.
- [ ] Manual F: collapse aside panel → reload page → panel remains collapsed.
- [ ] Token budget: < 500 tokens / task overhead with both halves enabled; 0 with both disabled.
