---
title: Using insight-flow with Cursor
sidebar_label: Cursor
sidebar_position: 11
---

# Using insight-flow with Cursor

insight-flow scaffolds the same agent skills for Cursor that it ships for Claude
Code. The skills come from one canonical source, so `/taskmaster`,
`/task-implement`, `/task-review`, and the rest behave the same in either editor —
only the on-disk scaffolding and the live-feed fidelity differ.

## 1. Scaffold the Cursor surface

Pick the Cursor target when you initialize the project:

```bash
insight-flow init --editor cursor   # Cursor only
insight-flow init --editor all      # both Claude Code and Cursor
```

By default (no `--editor`), `init` auto-detects: an existing `.cursor/` directory
selects Cursor, an existing `.claude/` selects Claude Code, and a fresh project
defaults to Claude Code. You can also pin the target with `"editor": "cursor"` in
`taskflow.config.json`.

`--editor cursor` writes:

- **`.cursor/skills/<name>/SKILL.md`** — one folder per skill, invokable as
  `/<name>` in Cursor's agent chat (e.g. `/taskmaster`, `/task-implement`).
- **`AGENTS.md`** at the project root — the cross-agent context block Cursor reads
  (the Cursor equivalent of the `CLAUDE.md` section).
- **`.cursor/hooks.json`** plus thin hook scripts under `.cursor/hooks/` —
  `insight-flow-event.sh`, `insight-flow-stop.sh`, and
  `insight-flow-approval.sh`. The scripts pipe Cursor's hook stdin to
  `insight-flow hook <event> --provider cursor`, so Cursor's lifecycle events
  stream into the dashboard and fire the same OS / browser notifications as
  Claude.

Re-running `init` is safe: it skips files that already exist and refreshes the
`insight-flow` section of `AGENTS.md`.

## 2. The `cursor` provider badge

Every lifecycle event a Cursor session emits is tagged with the `cursor`
provider. In the dashboard activity feed those events carry a **`cursor`** badge,
so you can tell at a glance which editor produced each event (events without a
provider are treated as `claude` for back-compat). See
[CLI → Events & hooks](../cli/events-and-hooks.md) for the event vocabulary.

When a Cursor agent finishes a turn, the stop hook also posts to the dashboard's
done endpoint, surfacing a browser toast — the same **Done** notification path
Claude uses.

## Caveats

Cursor's hook model differs from Claude Code's in two ways worth knowing:

- **Cloud agents fire only partial lifecycle hooks.** Cursor's cloud agents don't
  emit the full session / prompt-lifecycle hook set, so the live feed for cloud
  runs is partial. Local Cursor agents emit the full set wired in
  `.cursor/hooks.json`.
- **No native permission event; matchers are insight-flow-defined.** Cursor has
  no equivalent of Claude's `PermissionRequest` event. insight-flow synthesizes
  approval gating in `.cursor/hooks/insight-flow-approval.sh`, which runs on
  `beforeShellExecution`, `preToolUse`, and `beforeMCPExecution`. The script's
  matchers — sensitive shell commands such as `git push`, `git reset --hard`,
  `rm -rf`, `npm publish`, `--force`, and `deploy`; Shell-like tools; and (always)
  MCP executions — are defined by insight-flow and are yours to tune. When a gate
  fires it records `approval-required`, raises a notification, and returns
  `{"permission":"ask"}` so Cursor pauses for you. Gates **never auto-deny** —
  the non-sensitive path returns `{"permission":"allow"}`.

## See also

- [Configuration → `editor`](../configuration.md)
- [CLI → Events & hooks](../cli/events-and-hooks.md) ·
  [Setup & Dashboard](../cli/setup-and-dashboard.md)
- [Concepts → Agents](../concepts/index.md)
- [Troubleshooting](./troubleshooting.md) — including "slash commands don't work
  right after init".
