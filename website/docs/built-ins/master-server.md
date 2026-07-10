---
title: Master server
sidebar_label: Master server
sidebar_position: 5
description: The multi-project overview server — config keys, HTTP endpoints, the in-memory registry, and Claude project status states.
---

# Master server

The **master server** is the multi-project overview — and the **home base** you
start from. A single project dashboard shows one project; the master server
aggregates many, and lets you create new ones from the browser. It runs via
`insight-flow master`, and `insight-flow ui` auto-starts it
(`insight-flow master --port 6100`). It also opens automatically when you run
bare **`insight-flow` in a folder with no project** (instead of erroring), so a
non-coder can install globally and go straight to the UI. The code lives under
`packages/taskflow/src/master/`. It is self-contained — its own lock at
`~/.insight-flow/master.lock`, its own config, and an in-memory project
registry.

---

## Home base — create projects from the UI

For a **no-terminal / non-coder** start, install globally and just run it:

```bash
npm install -g insight-flow
insight-flow          # in a folder with no project → opens the home base
```

The overview at `http://localhost:6100/overview` shows your projects and a
**“+ New project”** button. Click it, give the project a name, and the master:

1. scaffolds a folder at **`~/insight-flow-projects/<slug>`** — override the base
   with the `INSIGHT_FLOW_PROJECTS_HOME` env var,
2. runs `insight-flow init` on it (so it's a real project),
3. registers it, so it appears on the overview.

To open a created project's dashboard, run `insight-flow` in its folder.

:::note Localhost-only
`POST /api/projects/create` writes to disk (it scaffolds a project), so it is
gated to **loopback callers** — a request from another machine on the network
gets `403`. Project names are validated and confined to the projects-home root
(no path traversal).
:::

---

## Config

Config is loaded by `master/config.ts` from `~/.insight-flow/master.json`. The
file is optional; missing or invalid config falls back to the defaults below.

| Key          | Type               | Default | Controls                                                                                                        |
| ------------ | ------------------ | ------- | --------------------------------------------------------------------------------------------------------------- |
| `port`       | `number` (1–65535) | `6100`  | Port the master server listens on.                                                                              |
| `standalone` | `boolean`          | `false` | When `true`, the server rejects project registration (`POST /api/register` returns `503`) — overview-only mode. |

The schema (`MasterServerConfigSchema`, Zod) and the `MasterServerConfig` type
live in `master/config.ts` and `master/types.ts`. The CLI flag `--port`
overrides the config value per invocation.

---

## Endpoints

HTTP handlers in `master/server.ts`. All responses set permissive CORS headers
(`Access-Control-Allow-Origin: *`); `OPTIONS` preflight returns `204`.

| Method | Path                       | Purpose                                                                                                                                                                                                                         |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/events`                  | Server-Sent Events stream (N83, replaced socket.io). Overview clients subscribe with `EventSource('/events')`; `project-update` frames broadcast on registry changes. Sends `retry: 1000` then a `: ping` heartbeat every 25 s. |
| `POST` | `/api/register`            | Register / upsert a project (`{ label, url, projectId }`). Returns `{ id }`. Rejected with `503` when `standalone` is `true`.                                                                                                   |
| `POST` | `/api/projects/create`     | **Create a project from the UI** (`{ name }`) — scaffolds `~/insight-flow-projects/<slug>`, runs `init`, and registers it. Returns `{ id, name, path }`. `400` for an invalid name, `409` if one already exists, **`403` for non-loopback callers** (writes to disk, so localhost-only). |
| `POST` | `/api/projects/:id/update` | Replace a project's full state (`MasterProjectState`). `401` for an unknown id. Broadcasts `project-update`.                                                                                                                    |
| `POST` | `/api/projects/:id/status` | Update only a project's `claudeStatus`. `400` for an invalid status value, `401` for an unknown id. Broadcasts `project-update`.                                                                                                |
| `GET`  | `/api/activity/:projectId` | Last 3 activity events for a project (`{ project, events }`). `404` for an unknown id.                                                                                                                                          |
| `GET`  | `/overview`                | The server-rendered overview HTML (`getOverviewHtml`).                                                                                                                                                                          |

Any other path returns `404`; an unhandled error returns `500`.

:::note Live updates use SSE
Live updates use native Server-Sent Events at `GET /events` (N83, which replaced
socket.io). The single-project dashboard likewise streams over SSE (at `/sse`) —
both use Server-Sent Events; they're just separate servers.
:::

---

## Project registry

The registry is **in-memory** (`master/registry.js`) — no persistence across
restarts. `POST /api/register` calls `registry.upsert(projectId, label, url)`,
which returns a generated `id`; subsequent updates address the project by that
`id`. Each registered project is a `MasterProjectEntry` (`master/types.ts`):

| Field          | Type                 | Notes                                                       |
| -------------- | -------------------- | ----------------------------------------------------------- |
| `id`           | `string`             | Registry-assigned handle used by update / status endpoints. |
| `projectId`    | `string`             | Caller-supplied project identifier.                         |
| `label`        | `string`             | Human-readable project name.                                |
| `url`          | `string`             | The project dashboard URL.                                  |
| `registeredAt` | `string`             | ISO timestamp of first registration.                        |
| `lastSeenAt`   | `string`             | ISO timestamp of last update.                               |
| `state`        | `MasterProjectState` | Current task + activity snapshot (see below).               |

`MasterProjectState` carries `currentTaskId`, `currentTaskTitle`,
`currentTaskStatus`, `taskCounts` (`Record<string, number>`), `recentActivity`
(`object[]`), and the optional `claudeStatus`.

---

## Claude project status states

The `ClaudeProjectStatus` vocabulary (`master/types.ts`). The master accepts
**both** vocabularies so projects can upgrade independently of each other.

| Status                | Vintage            | Meaning                                           |
| --------------------- | ------------------ | ------------------------------------------------- |
| `active`              | legacy three-state | Claude session is actively working.               |
| `idle`                | legacy three-state | Session is idle.                                  |
| `permission-required` | legacy three-state | Session is blocked on a permission prompt.        |
| `done`                | N68 four-state     | Derived from `/log/events` — work complete.       |
| `awaiting-permission` | N68 four-state     | Derived from `/log/events` — awaiting permission. |

`POST /api/projects/:id/status` validates against exactly this set; any other
value returns `400`.
