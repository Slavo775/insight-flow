---
title: Troubleshooting & FAQ
sidebar_label: Troubleshooting
sidebar_position: 10
---

# Troubleshooting & FAQ

Common problems and their fixes. Each entry is grounded in how insight-flow
actually behaves — the commands below are copy-pasteable.

## Slash commands / hooks don't work right after `init`

`insight-flow init` writes the role files, slash commands, and hook scripts your
editor reads at **session start**. An editor that's already open won't pick them
up until it re-reads that scaffolding.

**Fix:** restart the session. In Claude Code, `/exit` and reopen the project (or
start a fresh `claude` session in the project root). The new slash commands
(`/taskmaster`, `/task-implement`, …) and the lifecycle hooks load on the next
start.

See [CLI → Events & hooks](../cli/events-and-hooks.md) for what the hooks emit.

## Port already in use

insight-flow runs two servers on fixed default ports:

- the **dashboard** on `6006` (`insight-flow ui`, the default command), and
- the **multi-project master** on `6100` (`insight-flow master`, which
  `insight-flow ui` auto-starts).

If another process holds a port, override it:

```bash
insight-flow ui --port 6007        # dashboard on a different port
insight-flow master --port 6101    # master on a different port
```

You can also set the dashboard port permanently via `server.port` in
`taskflow.config.json` (see [Configuration → `server`](../configuration.md)).

## Dashboard looks stale or shows "This page crashed"

The dashboard is server-rendered HTML with a live Socket.IO connection; a stale
tab can drift out of sync after a redeploy or a long sleep.

**Fix:** hard-refresh the browser (Cmd+Shift+R on macOS, Ctrl+Shift+R on
Windows/Linux). If that doesn't clear it, stop and restart `insight-flow ui`.

If you're hacking on **this documentation site** locally and a page won't update,
clear the Docusaurus cache and restart the dev server:

```bash
cd website
npx docusaurus clear
npm run start
```

## Old project layout (`workTasks/` at the repo root)

Projects created before the consolidated layout keep their task state in
`workTasks/` (and `.events/`) at the project root. The current layout lives under
`insightFlow/workTasks/` + `insightFlow/events/`.

**Fix:** run the migration. It moves the directories as-is — JSON contents are
never touched — and is idempotent (already-migrated projects are a no-op):

```bash
insight-flow migrate-layout --dry-run    # preview the moves + any blockers
insight-flow migrate-layout              # perform the move
```

If a previous migration left a stray doubled `insightFlow/workTasks/workTasks/Nxx-…`
folder, clean it up with `--fix-strays` (only empty / scaffold-only strays are
removed; a stray carrying a real review is preserved and reported):

```bash
insight-flow migrate-layout --fix-strays
```

See [CLI → Config & migration](../cli/config-and-migration.md).

## An agent reports a quality-gate or PR step was "skipped"

insight-flow ships **zero** technology assumptions: it has no built-in typecheck,
lint, test, or PR-creation commands. Those reach an agent only when you supply
them through `agents.extend` in `taskflow.config.json`. When the relevant
`agents.extend` array is empty, the agent runs the canonical prompt and notes in
its report that the step was skipped — that's expected, not a bug.

**Fix:** wire the commands for the agent that skipped:

- [Add your stack's quality gates](./quality-gates.md) — for `task-implement` /
  `task-review-fix`.
- [Wire up PR creation for your git host](./wire-pr-creation.md) — for
  `task-git`.
- [Configuration → `agents.extend`](../configuration.md) — the full key reference.

After editing the config, re-sync the prompts:

```bash
insight-flow prompt-build --apply
```

## A browser tab opens automatically and you don't want it

`insight-flow ui` opens your default browser when the dashboard starts. To
suppress that (CI, headless servers, or you just prefer to open the tab
yourself), set the environment variable:

```bash
INSIGHT_FLOW_NO_OPEN=1 insight-flow ui
```

Any value other than exactly `1` is ignored, so the browser opens normally.

## The master server won't start

The master overview server holds a single lock file at
`~/.insight-flow/master.lock` recording the running process's `pid`, `port`, and
`startedAt`. If a previous master crashed or was killed hard, a stale lock can
block a fresh start.

**Fix:** inspect the lock and confirm whether the recorded process is still
alive:

```bash
cat ~/.insight-flow/master.lock     # shows {"pid":…, "port":…, "startedAt":…}
ps -p <pid>                         # is that pid still running?
```

If the process is gone (or it's a master you mean to replace), remove the stale
lock and start again:

```bash
rm ~/.insight-flow/master.lock
insight-flow master --port 6100
```

## See also

- [Configuration](../configuration.md) — every `taskflow.config.json` key and the
  environment variables.
- [CLI → Setup & Dashboard](../cli/setup-and-dashboard.md) ·
  [Events & hooks](../cli/events-and-hooks.md)
- [Run the multi-project master](./multi-project-master.md) ·
  [Upgrade from 1.x to 2.0](./upgrade-1x-to-2.md)
- [Concepts](../concepts/index.md)
