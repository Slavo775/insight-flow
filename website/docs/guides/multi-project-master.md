---
title: Manage many projects with the hub
sidebar_label: Multi-project hub
sidebar_position: 8
---

# Manage many projects with the hub

The **master hub** is one installable web app that manages every insight-flow
project on your machine. From a single page you switch between projects, open a
running one, start a stopped one, and create new ones — all on **one origin**
(`http://localhost:6100`), which is what makes it installable as a PWA and usable
from your phone.

> For the full reference (endpoints, config, registry, security model) see
> [Master hub](../built-ins/master-server.md). This guide is the walkthrough.

## 1. Start the hub

Most of the time you don't start it by hand — launching any project dashboard
auto-starts it:

```bash
insight-flow ui            # project dashboard on :6006; auto-starts the hub on :6100
```

To run it explicitly (e.g. as a long-lived process), or from a folder with no
project:

```bash
insight-flow master                # → http://localhost:6100/overview
insight-flow master --port 6200    # custom port
insight-flow                       # in a NON-project folder → opens the hub
```

Open `http://localhost:6100/overview` to see the switcher.

## 2. Register your projects

A project shows on the hub once it's registered. The easiest ways:

- **When you `init`** — answer "register with the hub?" (or pass
  `--register-hub`).
- **From the hub** — the **+ New project** modal registers by default.
- **Automatically** — running `insight-flow ui` in a project self-registers it.

Registrations persist in `~/.insight-flow/hub.json`, so your projects are still
listed after a restart (they show as *stopped* until their dashboards run).

```jsonc
// taskflow.config.json — a project's link to the hub (all optional)
{
  "master": {
    "url": "http://localhost:6100",
    "port": 6100,
    "startMasterLocally": true, // auto-spawn the hub if none is running
    "standalone": false          // true → this project never registers
  }
}
```

## 3. Open, start, and switch

On the overview, projects are split into **Running** and **Stopped**:

- **Running** → **`Open →`** takes you to that project's dashboard at
  `http://localhost:6100/project/<id>/` — served through the hub, same origin, so
  the `⌂ Hub` link brings you back.
- **Stopped** → **`Start →`** spawns the dashboard and drops you into it once it's
  live.
- **`↻ Refresh`** re-checks which projects are up.

## 4. Create a new project from the browser

Click **+ New project**:

1. Browse to a parent folder (a server-side folder browser).
2. Name it.
3. Pick install options — **task lifecycle events** (on), **agent activity
   tracking** (off), **composer-authoring flow** (off), **register with the hub**
   (on), and the **editor** (Claude / Cursor / all). When the parent folder is a
   git repo root, a **git-ignore** radio also appears — keep the footprint out of
   that repo via the shared `.gitignore` (default) or a local `.git/info/exclude`.

The hub scaffolds the folder, runs `init`, and adds it to the switcher.

## 5. Install it as an app (and use it on your phone)

Because it's a single origin, your browser can **install the hub as a PWA** (look
for "Install app"). Installed, it's one icon that switches between all your
projects, with **desktop/OS notifications** when a task changes status or Claude
finishes / needs permission — even while backgrounded.

To reach it from your phone or another device on the LAN, allowlist the machine's
address:

```bash
INSIGHT_FLOW_TRUSTED_HOSTS=192.168.0.77 insight-flow master --port 6100
# on the phone (same Wi-Fi): http://192.168.0.77:6100/overview  → then "Install app"
```

The hub prints a `LAN:` URL for each allowlisted host on startup.

:::warning Trust boundary
`INSIGHT_FLOW_TRUSTED_HOSTS` means "trust this network." With it set, **any device
on the LAN that reaches the port can create and start projects on the hub host.**
Use it only on networks you trust; leave it unset (localhost-only) on shared
Wi-Fi.
:::

## Legacy `bulk-*`

The older `bulk-register` / `bulk-ui` / `bulk-down` commands still work and their
entries fold into `hub.json`, but the hub above is the recommended path.

```bash
insight-flow bulk-ui --add "web-app" /path/to/web-app   # register by path (legacy)
insight-flow bulk-ui                                    # multi-select launcher (legacy)
insight-flow bulk-down                                  # stop what the last bulk-ui started
```

## See also

- [Master hub reference](../built-ins/master-server.md)
- [CLI → setup & dashboard](../cli/setup-and-dashboard.md)
- [Configuration → `master`](../configuration.md)
