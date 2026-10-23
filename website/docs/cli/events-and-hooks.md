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
| `trust-hooks` | Review & approve **this project's** `events.hooks`. Flags: `--yes` records approval, `--force` re-reviews even if already approved. |

## Trusting `events.hooks`

[`events.hooks`](../configuration.md#events) are arbitrary shell commands
(`sh -c`) stored in committed config, so cloning a repo must never silently run
someone else's commands. They **only run once a human has approved them**:

- `insight-flow trust-hooks` lists each configured command grouped by event and
  exits non-zero, telling you to re-run with `--yes`.
- `insight-flow trust-hooks --yes` records the approval — the commands are now
  trusted for this project. Add `--force` to re-review an already-approved set.
- Approval is keyed by project root and a hash of the hooks map, so **any edit to
  `events.hooks` invalidates it** and the set must be approved again.

While a project's hook set is untrusted, lifecycle events still fire but the
configured commands are skipped and insight-flow prints to stderr:

```
insight-flow: events.hooks are not trusted for this project — run `insight-flow trust-hooks` to review and approve them
```

## Example

```bash
insight-flow log-event start --task N42
insight-flow install-activity-hook --force
insight-flow trust-hooks --yes
```
