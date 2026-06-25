---
title: Run the multi-project master
sidebar_label: Multi-project master
sidebar_position: 8
---

# Run the multi-project master

The **master** is a single overview server that tracks several insight-flow
projects at once — one page showing each project's current task, live agent
status, and a link to its own dashboard. It runs on port **6100**.

## 1. Start the master

Most of the time you don't start it by hand: launching any project dashboard
auto-starts the master and registers the project with it.

```bash
insight-flow ui            # project dashboard on :6006; auto-starts master on :6100
```

Open `http://localhost:6100` to see the overview. To run the master explicitly
(e.g. as a long-lived process), use:

```bash
insight-flow master                # → http://localhost:6100
insight-flow master --port 6200    # custom port
```

The master is self-contained — its own lock lives at
`~/.insight-flow/master.lock`, and its project registry is in-memory.

## 2. How projects register

Each project's dashboard registers itself with the master when `insight-flow ui`
runs, and pushes live status updates as agents work. Registration is automatic;
the relevant `taskflow.config.json` knobs are under `master`:

```jsonc
// taskflow.config.json (all optional)
{
  "master": {
    "url": "http://localhost:6100",
    "port": 6100,
    "startMasterLocally": true,
    "standalone": false,
  },
}
```

- **`startMasterLocally`** (default `true`) — the dashboard auto-spawns a master
  if one isn't already running.
- **`standalone: true`** — this project never registers with a master (runs
  solo).
- **`url` / `port`** — point at a master on another host/port.

## 3. Launch several projects at once

To bring up dashboards for multiple registered projects in one go, use the
**bulk** commands. Register projects once, then launch:

```bash
insight-flow bulk-ui --add "web-app" /path/to/web-app   # register by path
insight-flow bulk-ui --add "api" /path/to/api
insight-flow bulk-ui --list                             # list registered projects
insight-flow bulk-ui                                    # interactive multi-select launcher
```

Each launched dashboard registers with the master, so they all appear on the
`:6100` overview. Stop everything the last `bulk-ui` started with:

```bash
insight-flow bulk-down
```

## 4. Verify

With one or more dashboards running, open `http://localhost:6100`. Each project
shows as a card with its current task and a live status badge; cards go neutral
when a project's server goes offline (no heartbeat for ~60s).

## See also

- [CLI → setup & dashboard](../cli/setup-and-dashboard.md)
- [Configuration → `master`](../configuration.md)
