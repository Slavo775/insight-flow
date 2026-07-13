---
title: Setup & Dashboard
sidebar_label: Setup & Dashboard
sidebar_position: 2
---

# Setup & Dashboard

Bootstrap insight-flow in a project and launch its servers. These commands don't
require existing task state.

| Command | Purpose |
|---------|---------|
| `init` | Initialize insight-flow in the current project (scaffold roles, commands, config). Flags: `--force`, `--examples`, `--editor`. |
| `install-flow <flow-id>` | Install a built-in or custom flow into the current project — its slash commands, subagents, any `mcp-server`, and hooks. E.g. `install-flow default` (the standard task lifecycle) or `install-flow composer-authoring`. Idempotent; validates the id against the flow registry; `--force` overwrites a conflicting `.mcp.json` entry. |
| `ui` | Launch the dashboard server (default command). `--port` (default `6006`). Auto-starts the [master hub](../built-ins/master-server.md) unless `master.startMasterLocally` is `false`. |
| `master` | Launch the [master hub](../built-ins/master-server.md) — the single-origin, installable switcher for all your projects. `--port` (default `6100`). Bare `insight-flow` in a folder with **no project** opens this too. |
| `help` | Show help text. |
| `version` | Show the installed version. |

## Multi-project

The primary way to manage several projects is the **[master hub](../built-ins/master-server.md)**
— a single-origin, installable switcher that opens, starts, and creates projects
from the browser:

```bash
insight-flow master        # → http://localhost:6100/overview (the switcher)
```

Register projects at `init` time (`--register-hub`) or from the hub's **+ New
project** modal; see the [multi-project hub guide](../guides/multi-project-master.md).

### Legacy `bulk-*`

The `bulk-*` commands predate the hub. They still work (and their entries fold
into the hub's `hub.json`), but prefer the hub for new setups.

| Command | Purpose |
|---------|---------|
| `bulk-register` | Register a project folder for bulk operations. |
| `bulk-unregister` | Unregister a project folder. |
| `bulk-ui` | Launch dashboards for multiple projects. Flags: `--add`, `--remove`, `--list`, `--no-open`. |
| `bulk-down` | Stop all servers started by the last `bulk-ui`. |
| `bulk-init` | Re-run `init` across registered projects. Flags: `--force`, `--examples`, `--editor`. |
| `bulk-prompt-build` | Re-sync role files across registered projects. |

## Examples

```bash
npx insight-flow init --examples       # init with example tasks
insight-flow                           # same as `insight-flow ui` → :6006
insight-flow ui                        # dashboard + auto-starts master on :6100
insight-flow master --port 6100        # master overview only
```

:::note Deprecated aliases
`ui-batch-register`, `ui-batch-unregister`, `ui-batch-down`, and `batch-ui` are kept
as aliases of the `bulk-*` commands for one release.
:::
