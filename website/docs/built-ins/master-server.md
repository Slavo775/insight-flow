---
title: Master hub
sidebar_label: Master hub
sidebar_position: 5
description: The single-origin, installable PWA hub — one page that switches between all your insight-flow projects, starts stopped ones, creates new ones, and streams live status.
---

# Master hub

The **master hub** is the multi-project home base — one installable web app that
manages every insight-flow project on your machine. A single project dashboard
shows one project; the hub aggregates many under **one origin**, reverse-proxies
each project's dashboard at a stable URL, starts stopped projects, creates new
ones from the browser, and streams live status for all of them over one
connection.

It runs via `insight-flow master`; launching any project dashboard
(`insight-flow ui`) auto-starts it, and running bare **`insight-flow` in a folder
with no project** opens it directly (so a non-coder can install globally and go
straight to the UI). The code lives under `packages/taskflow/src/master/`. It is
self-contained — its own lock at `~/.insight-flow/master.lock`, its own config,
and a persistent project registry at `~/.insight-flow/hub.json`.

Because everything is served from the hub's single origin, it can be **installed
as a Progressive Web App** and use **one notification permission** for all your
projects — including from your phone (see [Security & LAN/mobile](#security--lanmobile)).

---

## Start it

```bash
npm install -g insight-flow
insight-flow master                # → http://localhost:6100/overview
insight-flow master --port 6200    # custom port
```

You rarely start it by hand:

- **`insight-flow ui`** (a project dashboard) auto-spawns the hub if one isn't
  running — controlled by the `master.startMasterLocally` config (default
  `true`).
- **Bare `insight-flow` in a folder with no project** opens the hub instead of
  erroring.

The hub is single-instance: its lock lives at `~/.insight-flow/master.lock`, and
a second `insight-flow master` prints "already running on port … (pid …)" and
exits. On start it logs the `Overview:` URL, one `LAN:` URL per trusted host (see
below), the mode, and the lock path.

---

## The overview — a project switcher

`http://localhost:6100/overview` (also served at `/`) is a **switcher**, split
into two sections:

- **Running** projects — each with an **`Open →`** button that takes you to the
  project's dashboard at `/project/<id>/` (served through the hub, same origin).
- **Stopped** projects — each with a **`Start →`** button that spawns the
  project's dashboard and, once it's live, navigates you straight to it.

Each card shows the project's current task, task-count chips, a mini activity
feed, and a live Claude-status badge. A section hides itself when empty. The top
bar has **`↻ Refresh`** (re-probe liveness), **`+ New project`**, and a **`⚙`**
settings popover for notification toggles.

When you open a project through the hub, a floating **`⌂ Hub`** link is injected
into the page so you can jump back to the switcher.

---

## Registering projects

A project appears on the hub once it's in `~/.insight-flow/hub.json`. Three ways
in:

1. **At `init` time (opt-in).** `insight-flow init` asks whether to register with
   the hub; `--register-hub` / `--no-register-hub` set it non-interactively. The
   **New project** modal registers by default.
2. **Automatically when a dashboard boots.** `insight-flow ui` self-registers
   with the hub (`POST /api/register`) and gets a per-project token for live
   updates.
3. **Reverse handshake on hub start.** When the hub boots it pings each
   registered project's known port; running dashboards re-register (so they show
   as online right away), stopped ones simply don't answer.

The persistent entry (`HubProjectEntry`) holds `id`, `label`, `path`, an assigned
dashboard `port` (from `6007` up), `bulkRegistered`, and `registeredAt`. Whether
a project is **online** is not stored — it's derived at runtime from a live
connection (see [Liveness](#liveness--refresh)).

:::note Legacy `bulk-*`
The older `bulk-register` / `bulk-ui` commands still work and their entries are
folded into `hub.json` automatically, but the hub is now the primary
multi-project path — prefer registering at `init` time or from the **New
project** modal.
:::

---

## Open & Start via `/project/<id>/`

The hub **reverse-proxies** each running dashboard under a stable, same-origin
path:

```
http://localhost:6100/project/<projectId>/           # the project's dashboard
http://localhost:6100/project/<projectId>/agent       # any sub-route works
```

- The path is keyed on the stable **project id** (its name), so the URL survives
  a hub restart.
- A legacy `/p/<id>/…` path **301-redirects** to `/project/<id>/…` (with
  `Cache-Control: no-store`).
- A registered-but-stopped project shows a friendly "not running" page; an
  unknown id is a 404.
- **`Start →`** (`POST /api/hub/projects/:id/start`) picks a free port, spawns
  the dashboard detached, and waits until it actually registers before handing
  you the URL.

The proxy only ever targets a **loopback** dashboard (an SSRF guard), and a
project's own `/hub/*` control routes are **never** proxied.

---

## New project — in-app modal

**`+ New project`** opens an in-app modal (no terminal, no `prompt()`):

1. **Browse to a folder** — a server-side folder browser
   (`GET /api/fs/list`) lists sub-directories, confined to a root
   (`INSIGHT_FLOW_BROWSE_ROOT`, default your home folder). No `..` / symlink
   escape.
2. **Choose an init location** — a radio group:

   - **Use the selected folder** (default) — inits insight-flow **directly** in
     the folder you browsed to, exactly like the `insight-flow init` CLI. The
     name field below becomes a **registry label** ("Project name (label)"),
     defaulting to the selected folder's basename. In-place init is
     **merge-only / non-destructive**: an existing `.claude/` and `CLAUDE.md`
     are preserved (only insight-flow's marker section is appended to
     `CLAUDE.md`), and a same-named `.claude/commands/*.md` whose content
     differs is **kept** (not overwritten) and surfaced as a non-fatal warning
     ("Kept your existing files…"). Re-initing an already-initialized folder
     returns a clear **409 "insight-flow is already initialized in this
     folder"**.
   - **Create a new subfolder** (opt-in) — the older behavior: scaffolds
     `<chosenFolder>/<slug>`; the name field is the **new folder name**.
3. **Name it** — validated (`A–Z a–z 0–9 space _ -`, ≤ 60 chars). In-place it is
   the registry label; in subfolder mode the folder is `<chosenFolder>/<slug>`.
4. **Pick install options** (forwarded to `insight-flow init`):

   | Option | Default | Effect |
   | --- | --- | --- |
   | **Task lifecycle events** | on | Lifecycle hooks (badge + feed). Zero tokens. |
   | **Agent activity tracking** | off | Richer activity (~50 tokens/turn). |
   | **Composer-authoring flow** | off | Installs the `composer-authoring` flow. |
   | **Register with this hub** | on | Adds the project to `hub.json`. |
   | **Editor** | Claude | `claude` \| `cursor` \| `all`. |
   | **Git ignore** | shared | Only shown when the chosen folder is a git repo root — `shared` \| `local`. |

   Choosing **Cursor** disables the Claude-shaped options (they're
   Claude-specific) with a note.

5. **Choose how to ignore the footprint** — a **Git ignore** radio group that
   appears **only when the folder you browsed to is itself a git repo root** (a
   `.git` exists directly in it); it's hidden otherwise. When the folder is a git
   repo, insight-flow's footprint is now **ignored by default** — there is no
   "commit it" opt-out, you only choose where the rule lives:

   - **Shared `.gitignore`** (default) — writes the rule to the committed
     `.gitignore`, so teammates get it too.
   - **Local only (`.git/info/exclude`)** — writes to the repo-local exclude
     file, which is not committed (private to you).

   What gets ignored depends on the init location:

   - **In-place** — writes only insight-flow's own footprint rules
     `/insightFlow/` and `/taskflow.config.json`. It deliberately does **not**
     ignore `.claude/`, because that folder is shared with your editor and may
     already be committed.
   - **Subfolder** — writes a single anchored rule `/<slug>/` that ignores the
     whole new-project subfolder from the enclosing repo.

   Either way the write is worktree/submodule-aware and idempotent. A failed
   ignore-write is surfaced as a **non-fatal warning** (the project is still
   created), the same as per-flow install warnings.

The hub then scaffolds the folder, runs `init` with those options, registers it,
and returns any per-flow install warnings. Creating a project writes to disk, so
this endpoint is guarded — see [Security](#security--lanmobile).

---

## Install as a PWA + notifications

Because the hub is a single origin, it's an installable **Progressive Web App**:

- **`GET /manifest.webmanifest`** — `name: "insight-flow hub"`, `start_url: "/"`,
  `display: "standalone"`, SVG + maskable icons.
- **`GET /sw.js`** — a service worker (root scope) that precaches an offline
  shell (`/`, the manifest, icons, and the notification sounds), serves
  navigations network-first with a cached fallback, and **never** caches
  `/project/*`, `/p/*`, `/api/*`, or `/events`.
- **`GET /hub-notify.js`** — a shared notification client injected into the
  overview **and** every proxied project page. It registers the service worker,
  requests notification permission once, holds the `/events` stream, and fires a
  **service-worker notification** (works while backgrounded / installed) on:
  - a task-status change into `implemented`, `approved`, `fix-needed`, `fixed`,
    `merged`, `changes-requested`, `changes-implemented`, or `done`;
  - a Claude-status change — `active → done` ("Claude finished") or
    `→ permission` ("needs permission").

  Notifications carry a stable `tag` so the same event across multiple open hub
  tabs collapses into one. Sounds play the bundled mp3 first and fall back to a
  Web-Audio chime. Per-status and per-project mutes live in the `⚙` popover.

Install it from your browser's "Install app" action, then launch it like any
app — one icon that switches between all your projects.

---

## Liveness & refresh

- **Connection-based online/offline.** A running dashboard holds a liveness
  stream (`GET /api/hub/live`, token-gated); while it's open the project is
  **online**, and closing it flips it **offline**. No polling.
- **On-demand refresh.** **`↻ Refresh`** (`POST /api/hub/refresh`) probes each
  registered project's `/health` (loopback-only) once and updates online state.
- **List.** `GET /api/hub/projects` returns the client-safe project list.

---

## Config

Config is loaded from `~/.insight-flow/master.json` (optional; missing/invalid
falls back to defaults).

| Key          | Type               | Default | Controls                                                                                       |
| ------------ | ------------------ | ------- | ---------------------------------------------------------------------------------------------- |
| `port`       | `number` (1–65535) | `6100`  | Port the hub listens on.                                                                        |
| `standalone` | `boolean`          | `false` | When `true`, the hub rejects project registration (`POST /api/register` → `503`) — view-only.  |

The CLI flag `--port` overrides `port` per invocation. A project points at a hub
via its own `taskflow.config.json` `master` key (`url`, `port`, `standalone`,
`startMasterLocally`).

**Environment variables**

| Var | Default | Controls |
| --- | --- | --- |
| `INSIGHT_FLOW_TRUSTED_HOSTS` | *(unset)* | Comma-separated hosts allowed to reach the control-plane over the LAN (see below). |
| `INSIGHT_FLOW_BROWSE_ROOT` | home folder | Ceiling for the New-project folder browser. |
| `INSIGHT_FLOW_CONFIG_DIR` | `~/.insight-flow` | Overrides where `hub.json` / port pointers live (power users / tests). |

---

## Security & LAN/mobile

The hub binds **all interfaces** and sets `Access-Control-Allow-Origin: *`, so a
loopback source address alone is not enough to keep a remote page out. Its
control-plane is protected by header + peer checks:

- **`isTrustedLocalRequest`** — a request passes only if its `Host` (and any
  `Origin`) is loopback (or an allowlisted host), and its `Sec-Fetch-Site`, if
  present, is `same-origin`/`none`. This defeats **DNS rebinding** and **CSRF**.
  It guards the read endpoints (`/api/hub/projects`, `/api/hub/refresh`).
- **`isTrustedActionRequest`** — the write/exec endpoints (`/api/fs/list`,
  `/api/projects/create`, `/api/hub/projects/:id/start`) add a **peer-IP**
  defense: a non-loopback client is accepted **only** when it targets an
  explicitly allowlisted host — a forged loopback `Host` from the LAN is
  rejected.
- **`/api/register` stays loopback-only** (dashboards always register from the
  same machine) — it is *not* widened by the allowlist.
- **Token privacy** — the client-facing project list strips each project's token,
  url, and filesystem path; only labels + task state are exposed.

### Using the hub from your phone (`INSIGHT_FLOW_TRUSTED_HOSTS`)

By default everything is **localhost-only**. To use the installable PWA from a
phone or another device on your LAN, allowlist the machine's LAN address:

```bash
INSIGHT_FLOW_TRUSTED_HOSTS=192.168.0.77 insight-flow master --port 6100
# then, on the phone (same Wi-Fi):  http://192.168.0.77:6100/overview
```

The startup log prints a `LAN:` line for each allowlisted host. With this set,
**Open / Start / New project / Refresh** all work from the phone.

:::warning Trust boundary
`INSIGHT_FLOW_TRUSTED_HOSTS` is an explicit "trust this network" switch. With it
set, **any device on the LAN that can reach the port with the right Host can
create and start projects (write files + spawn processes) on the hub host.** Use
it only on networks you trust. Leave it unset on shared/untrusted Wi-Fi — the
default is localhost-only for every client, including scripts. (Enter bare IPv6
addresses bracketed, e.g. `[fe80::1]`.)
:::

---

## Endpoints

HTTP handlers in `master/server.ts`. `OPTIONS` preflight returns `204`; any
unknown path returns `404`.

| Method | Path | Purpose | Guard |
| --- | --- | --- | --- |
| `GET` | `/project/<projectId>/*` | Reverse-proxy a running dashboard | proxy target must be loopback; `/hub/*` blocked |
| `GET` | `/p/<id>/*` | 301-redirect to `/project/…` (`no-store`) | — |
| `GET` | `/events` | Overview SSE (`project-update` frames) | — |
| `POST` | `/api/register` | Dashboard self-register → `{ id, token }` | loopback-only + trusted |
| `POST` | `/api/projects/:id/update` | Push a project's full state | per-project token |
| `POST` | `/api/projects/:id/status` | Push `claudeStatus` | per-project token |
| `GET` | `/api/activity/:projectId` | Last 3 activity events | — |
| `GET` | `/api/fs/list?dir=` | New-project folder browser (response includes `hasGit` for the listed dir) | trusted-action |
| `POST` | `/api/projects/create` | Init + register a project — accepts optional `location: "in-folder" \| "subfolder"` (default `"in-folder"`, in-place) and `gitIgnore: "shared" \| "local"`; re-initing an already-initialized folder returns **409 "already initialized"** | trusted-action |
| `GET` | `/api/hub/projects` | Project list (client-safe views) | trusted |
| `GET` | `/api/hub/live?id&token` | Liveness stream | per-project token |
| `POST` | `/api/hub/refresh` | On-demand health probe | trusted |
| `POST` | `/api/hub/projects/:id/start` | Spawn a stopped dashboard | trusted-action |
| `GET` | `/manifest.webmanifest`, `/icon*.svg` | PWA manifest + icons | — |
| `GET` | `/sw.js`, `/hub-notify.js` | Service worker + notify client | — |
| `GET` | `/sounds/*.mp3` | Notification sounds | — |
| `GET` | `/`, `/overview` | The switcher shell | — |

:::note Live updates use SSE
Overview updates stream over native Server-Sent Events at `GET /events`. A single
project's dashboard likewise streams over SSE — they're separate servers, both
SSE.
:::

---

## Project registry

Two layers:

- **Persistent membership** — `~/.insight-flow/hub.json` (`{ projects: [...] }`),
  written at `init` (opt-in) or first registration, and folding in legacy
  `bulk-*` entries. Survives restarts.
- **Runtime state** — an in-memory map (`master/registry.ts`) holding each
  project's live url, token, online flag, and `MasterProjectState`
  (`currentTaskId`, `currentTaskTitle`, `currentTaskStatus`, `taskCounts`,
  `recentActivity`, `claudeStatus`). Seeded from `hub.json` on boot, so
  registered projects show up (offline) before their dashboards start.

The client-facing projection (`toPublicView`) drops `token`, `url`, and `path`.

---

## Claude project status states

The `ClaudeProjectStatus` vocabulary. The hub accepts both the legacy
three-state and the four-state set so projects can upgrade independently.

| Status                | Meaning                                    |
| --------------------- | ------------------------------------------ |
| `active`              | Claude session is actively working.        |
| `idle`                | Session is idle.                           |
| `permission-required` | Blocked on a permission prompt (legacy).   |
| `done`                | Turn complete (derived from `/log/events`).|
| `awaiting-permission` | Awaiting permission (derived).             |

`POST /api/projects/:id/status` validates against exactly this set; any other
value returns `400`.
