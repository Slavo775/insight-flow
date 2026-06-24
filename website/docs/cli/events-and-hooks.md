---
title: Events & Hooks
sidebar_label: Events & Hooks
sidebar_position: 10
---

# Events & Hooks

Emit activity/lifecycle events and wire insight-flow into Claude Code hooks. These
power the dashboard's live activity feed and timeline.

## Events

| Command | Purpose |
|---------|---------|
| `log-event` | Emit a typed lifecycle event. Flags: `--task`, `--data`, `--source`, `--hook-name`. |
| `log-activity` | Emit a narrative line to the activity feed. |
| `notify` | Fire an OS notification. Flags: `--title`, `--project`. |

`log-event` types include: `start`, `done`, `active`, `idle`, `edit-start`,
`edit-end`, `research-start`, `research-end`, `review-start`, `review-end`,
`git-start`, `git-end`.

## Hooks

| Command | Purpose |
|---------|---------|
| `install-activity-hook` | Install the Claude Code `PostToolUse` activity hook. Flag: `--force`. |
| `install-lifecycle-hooks` | Install lifecycle event hooks. Flag: `--bin`. |
| `migrate-hooks` | Refresh hook scripts after an upgrade. Flag: `--bin`. |
| `hook` | Sugar for `log-event`, mapped from Claude hook names (`Stop`, `Notification`, `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `SubagentStop`, `PermissionRequest`). Flag: `--provider cursor`. |

## Example

```bash
insight-flow log-event start --task N42
insight-flow install-activity-hook --force
```
