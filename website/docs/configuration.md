---
title: Configuration
sidebar_label: Configuration
sidebar_position: 5
description: Every key in taskflow.config.json — type, default, what it controls, and what changes when you change it.
---

# Configuration reference

insight-flow is configured per project by a single committed file at the project
root: **`taskflow.config.json`**. Every key is optional — an absent file (or an
absent key) falls back to the defaults documented below. This page lists every
key by area, with its type, default, what it controls, and **the effect of
changing it**.

:::info Source of truth
Defaults live in `packages/taskflow/src/core/config.ts`; the full schema (types
and optional keys) lives in `packages/taskflow/src/core/types.ts`
(`TaskflowConfig`). If this page and the code ever disagree, the code wins —
please open an issue.
:::

:::note The file is `taskflow.config.json`
That is the only name the CLI reads or writes (`config.ts`). There is **no**
`insightFlow.config.json` — if you have seen that name, it is a mistake.
:::

This page does **not** document CLI flags (per-invocation overrides like
`--port` or `--editor`). Those belong to individual commands — see the
[CLI reference](./cli/index.md).

---

## Top-level keys

| Key | Type | Default | Controls |
|-----|------|---------|----------|
| `workDir` | `string` | `"workTasks"` | Directory holding `master.json` + task shards + task folders. |
| `shardSize` | `number` | `10` | How many tasks go in each shard file (`tasks-N00-N09.json`, …). |
| `projectName` | `string` | inferred | Human-readable project label in dashboards / master overview. |
| `rolesDir` | `string` | `".claude/roles"` | Where agent role Markdown files are scaffolded and read from. |
| `editor` | `"claude" \| "cursor" \| "all"` | _(auto-detect)_ | Which harness(es) `init` / `bulk-init` scaffold. |
| `hooksVersion` | `number` | _(unset)_ | Marker for the bundled hook-script generation; managed by the CLI. |

**`projectName`** — if unset, it is inferred from the nearest `package.json`
`name`, else the project folder's basename, else `"project"`. Setting it
explicitly just pins the label.

**`editor`** — resolution precedence is `--editor` flag → `config.editor` →
auto-detect (`.claude/` / `.cursor/`) → `claude`. When you pass `--editor`
explicitly to `init`, it is persisted here.

**`hooksVersion`** — written/bumped by the CLI when bundled hooks change. The CLI
compares it against the installed package and warns when you should run
`insight-flow migrate-hooks`. You normally don't edit this by hand.

:::warning Changing `workDir`
`workDir` is the address of your entire task store. Repointing it after tasks
exist does **not** move anything — the CLI will look in the new directory, find
no `master.json`, and behave as an empty project. Your tasks aren't lost, but
they're orphaned until you point back or move the files yourself. The default
`"workTasks"` is layout-aware: the resolver automatically prefers
`insightFlow/workTasks/` (the N101 layout) when present and falls back to a
top-level `workTasks/`. Prefer `insight-flow migrate-layout` over editing this
by hand.
:::

:::warning Changing `shardSize`
`shardSize` is applied when shards are **created**. Changing it does **not**
re-shard files that already exist — old shards keep their original size and only
new shards use the new value, leaving the store inconsistently bucketed. Pick a
value at `init` time and leave it.
:::

---

## `server` — dashboard HTTP server

| Key | Type | Default | Controls |
|-----|------|---------|----------|
| `server.port` | `number` | `6006` | Port for `insight-flow ui` (the per-project dashboard). |

Runtime-only: changing it takes effect on the next dashboard start. The
`--port` flag on `insight-flow ui` overrides this for a single run. See also the
master server port under [`master`](#master--multi-project-overview).

---

## `activityEngine` — activity panel & event log

| Key | Type | Default | Controls |
|-----|------|---------|----------|
| `activityEngine.enabled` | `boolean` | `true` | Master switch for activity logging + the dashboard activity panel. **New projects are initialised with it on** (`insight-flow init` writes `true`). |
| `activityEngine.logFile` | `string` | `".taskflow-activity.jsonl"` | JSONL file (relative to `workDir`) events are appended to. |
| `activityEngine.maxEvents` | `number` | `200` | How many recent events are kept in memory / served to the panel. |
| `activityEngine.phaseMarkers` | `boolean` | `true` | Whether status-transition markers are recorded. |
| `activityEngine.hookEnrichment` | `boolean` | `true` | Enrich events with Claude Code / Cursor hook data. |
| `activityEngine.verbosity` | `"milestones" \| "detailed" \| "both"` | `"both"` | How much detail the activity stream carries. |

**Effect of disabling (`enabled: false`):** agents skip all `log-event` calls,
no JSONL is written, and the dashboard activity panel goes quiet. Use
`insight-flow install-activity-hook --force` if you ever need to install the hook
while disabled.

---

## `notifications`

| Key | Type | Default | Controls |
|-----|------|---------|----------|
| `notifications.browser` | `boolean` | `true` | OS / desktop notifications. |
| `notifications.cli` | `boolean` | `true` | Terminal notifications. |
| `notifications.sounds.enabled` | `boolean` | _(unset)_ | Play a sound with notifications. |

Turning a channel off suppresses that notification surface; the underlying events
still flow through the activity engine.

---

## `master` — multi-project overview

The master server is the cross-project overview that `insight-flow master` runs
(and that `insight-flow ui` auto-starts on `:6100`).

| Key | Type | Default | Controls |
|-----|------|---------|----------|
| `master.url` | `string` | `"http://localhost:6100"` | URL the dashboard links/iframes to for the overview. |
| `master.port` | `number` | `6100` | Port the master server listens on. |
| `master.standalone` | `boolean` | `false` | Run the master server independently. |
| `master.startMasterLocally` | `boolean` | _(unset)_ | Auto-start the master server alongside the dashboard. |

Changing `url` / `port` only takes effect on next start. If you point `url` at a
remote master, the dashboard embeds that instead of the local one.

---

## `observability.langfuse` — opt-in tracing sink

Disabled unless you opt in. When absent or `enabled: false`, the exporter is a
no-op and the optional `langfuse` SDK is never loaded — non-users pay nothing.

| Key | Type | Default | Controls |
|-----|------|---------|----------|
| `observability.langfuse.enabled` | `boolean` | `false` | Turns the Langfuse exporter on. |
| `observability.langfuse.host` | `string` | _(env / SDK default)_ | Langfuse API host. |
| `observability.langfuse.publicKey` | `string` | _(env)_ | Langfuse public key. |
| `observability.langfuse.secretKey` | `string` | _(env)_ | Langfuse secret key. |

**Credential resolution is config-first, env-fallback:** `publicKey` /
`secretKey` / `host` are read from config if present, otherwise from
`LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST` (then
`LANGFUSE_BASEURL`). If neither config nor env supplies both keys, the exporter
stays inert. Keep secrets in env so they never land in committed config — see
[environment variables](#environment-variables).

---

## `events`

| Key | Type | Default | Controls |
|-----|------|---------|----------|
| `events.dedupWindowSeconds` | `number` | _(unset)_ | Window during which duplicate events are dropped. |
| `events.hooks` | `Record<EventType, string[]>` | _(unset)_ | Shell commands to run on specific event types. |

`events.hooks` maps an event type (e.g. `done`) to an array of commands. Use it
to fan task lifecycle events out to your own tooling.

---

## `flows` — task → flow binding

Governs which flow a new task is bound to (N116). Flow ids are project ids:
`"default"` or `"custom:<slug>"`.

| Key | Type | Default | Controls |
|-----|------|---------|----------|
| `flows.defaultFlow` | `string` | `"default"` | Flow a task gets when no type mapping matches. |
| `flows.byType` | `Record<string, string>` | `{}` | Maps task type → flow id (e.g. `{ "fix": "custom:hotfix" }`). |

At create time the binding resolves `byType[<task type>]` → `defaultFlow`. An
empty `byType` (the default) routes every task to `defaultFlow`. An unknown
mapped flow falls back to `"default"` (non-fatal). Prefer the
`insight-flow set-default-flow` command over editing `defaultFlow` by hand — it
preserves `byType` and is what flow tooling expects.

---

## `agents`

| Key | Type | Default | Controls |
|-----|------|---------|----------|
| `agents.extend` | `Record<string, string[]>` | _(unset)_ | Stack-specific lines appended to each agent's prompt. |
| `agents.custom` | `CustomAgent[]` | _(unset)_ | Custom agent definitions (`name`, `role`, `description`, `outputContract`). |
| `agents.git.permissions` | `object` | _(see below)_ | Per-operation git allow/deny flags for `task-git`. |

### `agents.extend`

:::warning Deprecated
`agents.extend` is **deprecated and will be removed in a future release.** It
still works for existing configs, but don't use it for new projects — prefer
authoring a custom flow/agent (see the [composer authoring flow](./authoring/index.md)).
`insight-flow init` no longer scaffolds `agents.extend` stubs.
:::

insight-flow's shipped prompts contain **zero** technology assumptions. This is
where you (historically) inject your project's commands. Each key is an agent
name; each value is an array of strings appended to that agent's prompt at
`init` / `prompt-build` time.

```jsonc
{
  "agents": {
    "extend": {
      "task-implement":  ["Run `pnpm typecheck && pnpm lint && pnpm test` before marking implemented."],
      "task-review-fix": ["Re-run quality gates after every blocker fix."],
      "task-git":        ["For PR creation: `gh pr create --title \"<title>\" --body-file <path>`."]
    }
  }
}
```

Valid agent names: `task-analyze`, `taskmaster`, `task-implement`, `task-review`,
`task-review-fix`, `task-human-review`, `task-git`, `task-incident`,
`task-request-changes`, `taskmaster-change`. Unknown names are warned about and
skipped. Changing `extend` only takes effect after the next `init` /
`prompt-build`, which rewrites the role files. See
[Config & Migration](./cli/config-and-migration.md) for `prompt-build`.

### `agents.git.permissions`

Granular allow/deny for every git operation `task-git` can perform. All flags
default permissive **except `forcePush`**.

| Flag | Type | Default | Operation |
|------|------|---------|-----------|
| `remoteOps` | `"allow" \| "deny"` | _(unset)_ | Shorthand — see warning below. |
| `createBranch` | `boolean` | `true` | `git checkout -b` (local) |
| `checkout` | `boolean` | `true` | `git checkout <branch>` (local) |
| `commit` | `boolean` | `true` | `git commit` (local) |
| `push` | `boolean` | `true` | `git push` (remote) |
| `forcePush` | `boolean` | `false` | `git push --force` |
| `merge` | `boolean` | `true` | `git merge` to main |
| `deleteBranchLocal` | `boolean` | `true` | `git branch -d` (local) |
| `deleteBranchRemote` | `boolean` | `true` | `git push origin --delete` |
| `createPR` | `boolean` | `true` | `gh` / `glab` PR/MR create |

:::warning `remoteOps: "deny"` is a safety shorthand
Setting `remoteOps: "deny"` flips `push`, `forcePush`, `deleteBranchRemote`, and
`createPR` to `false` — **unless you explicitly set that individual flag** in the
same object. Example: `{ "remoteOps": "deny", "push": true }` allows `push` but
still blocks `forcePush`, `deleteBranchRemote`, and `createPR`. When `task-git`
hits a blocked operation it stops and prints how to unblock it. The exact runtime
resolution `task-git` performs is documented in
[AGENT_CONFIG](./reference/AGENT_CONFIG.md) — this page is the config surface;
that page is the agent behavior.
:::

---

## Adjacent configuration

Configuration that lives outside `taskflow.config.json` but shapes behavior.

### Global state — `~/.insight-flow/`

Per-machine (not per-project) files the CLI manages for you. You normally don't
edit these by hand.

| Path | Purpose |
|------|---------|
| `~/.insight-flow/master.lock` | Master server lock: `{ pid, port, startedAt }`. Created on start, cleared on shutdown. |
| `~/.insight-flow/master.json` | Optional master server config (`{ port, standalone }`, default port `6100`). |
| `~/.insight-flow/batch-ui.json` | Registry of projects for the bulk/multi-project dashboard (`bulk-ui` subcommands). |
| `~/.insight-flow/session-<id>.active` | Marker that a Claude session is active. |
| `~/.insight-flow/events-<id>.jsonl` | Per-session event log. |

### Environment variables

| Variable | Effect |
|----------|--------|
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key (fallback for `observability.langfuse.publicKey`). |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key (fallback for `observability.langfuse.secretKey`). |
| `LANGFUSE_HOST` | Langfuse API host (fallback for `observability.langfuse.host`). |
| `LANGFUSE_BASEURL` | Alternate Langfuse host, used only if `LANGFUSE_HOST` is unset. |
| `INSIGHT_FLOW_NO_OPEN` | Set to `"1"` to stop the dashboard from auto-opening a browser on start. |
| `CLAUDE_SESSION_ID` | Claude Code session id used to tag events when `--session-id` isn't passed. |

### Ports

| Port | Service | Config key | CLI override |
|------|---------|-----------|--------------|
| `6006` | Per-project dashboard | `server.port` | `insight-flow ui --port <n>` |
| `6100` | Multi-project master server | `master.port` | `insight-flow master --port <n>` |

---

## Complete example

A fully-populated `taskflow.config.json` showing every key with a representative
value. **Copy what you need** — you do not need every key; absent keys take the
defaults above. Do not commit real Langfuse secrets — prefer env vars.

```jsonc
{
  "workDir": "workTasks",
  "shardSize": 10,
  "projectName": "my-project",
  "rolesDir": ".claude/roles",
  "editor": "claude",
  "hooksVersion": 3,

  "server": {
    "port": 6006
  },

  "activityEngine": {
    "enabled": true,
    "logFile": ".taskflow-activity.jsonl",
    "maxEvents": 200,
    "phaseMarkers": true,
    "hookEnrichment": true,
    "verbosity": "both"
  },

  "notifications": {
    "browser": true,
    "cli": true,
    "sounds": { "enabled": true }
  },

  "master": {
    "url": "http://localhost:6100",
    "port": 6100,
    "standalone": false,
    "startMasterLocally": true
  },

  "observability": {
    "langfuse": {
      "enabled": false,
      "host": "https://cloud.langfuse.com"
    }
  },

  "events": {
    "dedupWindowSeconds": 60,
    "hooks": {
      "done": ["echo task done"]
    }
  },

  "flows": {
    "defaultFlow": "default",
    "byType": { "fix": "custom:hotfix" }
  },

  "agents": {
    "extend": {
      "task-implement": ["Run `pnpm typecheck && pnpm lint && pnpm test` before marking implemented."],
      "task-git": ["For PR creation: `gh pr create --title \"<title>\" --body-file <path>`."]
    },
    "custom": [],
    "git": {
      "permissions": {
        "remoteOps": "allow",
        "createBranch": true,
        "checkout": true,
        "commit": true,
        "push": true,
        "forcePush": false,
        "merge": true,
        "deleteBranchLocal": true,
        "deleteBranchRemote": true,
        "createPR": true
      }
    }
  }
}
```

## See also

- [Config & Migration](./cli/config-and-migration.md) — `migrate-*` and `prompt-build` commands.
- [AGENT_CONFIG](./reference/AGENT_CONFIG.md) — how `task-git` resolves `agents.git.permissions` at runtime.
- [CLI reference](./cli/index.md) — per-command flags (the per-invocation overrides this page omits).
