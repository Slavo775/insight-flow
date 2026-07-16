---
title: Debug logs & resolving issues
sidebar_label: Debug logs
sidebar_position: 11
---

# Debug logs & resolving issues

When something in the hub misbehaves — a notification that never fires, a project
that will not come online, the overview going blank — the answer is usually in a
log you cannot see in the terminal. The **debug log engine** captures those
errors to disk and shows them on one page, so you can diagnose a problem after it
happened instead of trying to reproduce it with a console open.

This guide explains what is captured, where it lives, how to read it, and a
step-by-step workflow for the most common issues.

## What it is

The master hub runs a small logging engine that:

- **captures errors automatically** — server crashes (in the master and in every
  project dashboard) and unhandled React errors in the web UI;
- **stores them on disk**, per project and per level, so they survive a restart;
- **shows them on the `/logs` page** of the hub, with filters;
- **exposes a read API** (`GET /api/logs`) for scripting.

It is a **debugging aid**, not an audit log. It is meant to be read by you (the
developer running the hub), and only from your own machine.

## Where logs live

Everything is written under your global config directory:

```
~/.insight-flow/logs/
├── master/                 # the hub server's own errors
│   ├── error.json
│   ├── warning.json
│   └── info.json
├── <project-name>/         # one folder per project that logged something
│   ├── error.json
│   └── ...
└── ...
```

- One folder per project (plus a reserved **`master`** folder for the hub
  itself). The folder name is a filesystem-safe slug of the project name.
- One file per **level**: `error.json`, `warning.json`, `info.json`.
- Each file is a JSON array of entries. One entry looks like:

  ```json
  {
    "type": "error",
    "message": "uncaughtException: Cannot read properties of undefined",
    "data": { "stack": "..." },
    "timestamp": "2026-07-16T19:54:29.887Z",
    "projectName": "my-app"
  }
  ```

## What gets captured automatically

You do not have to instrument anything. The engine already records:

| Source | What it catches |
| --- | --- |
| **Master server** | `uncaughtException` and `unhandledRejection` (logged, then the process exits cleanly on an uncaught error), plus internal request errors. |
| **Project dashboard server** | The same two crash handlers; each project forwards its errors to the master so they land in one place. |
| **Web UI (React)** | Any render error caught by the app's error boundary is posted to the log engine, so a blank screen leaves a trace instead of vanishing. |

Because an uncaught error is logged **before** the process exits, a hub or project
that crashed still leaves an `error.json` entry explaining why.

## Reading the logs

### The `/logs` page

Open the hub and go to:

```
http://localhost:6100/logs
```

You get a table of entries, newest first. You can filter by **project**
(including `master`, or *all*) and by **level** (error / warning / info). This is
the fastest way to answer "what just went wrong?".

### The API

For scripting, read the same data as JSON:

```bash
# every project, every level, newest first (first 100)
curl "http://localhost:6100/api/logs"

# only the master's errors
curl "http://localhost:6100/api/logs?project=master&type=error"

# page through a busy project
curl "http://localhost:6100/api/logs?project=my-app&page=2&pageSize=50"
```

**Query parameters**

| Param | Values | Default |
| --- | --- | --- |
| `project` | a project name, `master`, or `all` | `all` |
| `type` | `error`, `warning`, `info` | all levels |
| `page` | 1-based page number | `1` |
| `pageSize` | 1–500 | `100` |

**Response**

```json
{ "total": 137, "page": 1, "pageSize": 100, "logs": [ /* newest first */ ] }
```

Both the page and the API are **local-only**: requests are accepted from your own
machine (loopback) and refused otherwise. Nothing is ever sent off your machine.

## Retention & clearing

- Each level file keeps at most **1000 entries** per project. When it grows past
  that, the oldest entries are trimmed. Trimming is throttled (at most once every
  five minutes per file), so heavy logging never blocks a write.
- To **clear** a project's logs, delete its folder:

  ```bash
  rm -rf ~/.insight-flow/logs/my-app     # one project
  rm -rf ~/.insight-flow/logs/master     # the hub's own logs
  rm -rf ~/.insight-flow/logs            # everything
  ```

  The folder is recreated the next time something is logged.

## Sending your own log (advanced)

Servers ingest logs over `POST /log`. The hub accepts a body of
`{ "key": "<project-token|master>", "log": { "type", "message", "data?" } }`;
a project dashboard accepts `{ "log": { ... } }` and forwards it to the hub under
its own identity. The endpoint is local-only and fire-and-forget (it answers
`202` and never blocks the caller). Most users never call it directly — the
automatic capture above is the point — but it is there if a custom flow or agent
wants to record its own diagnostic line.

## Resolving common issues

A repeatable workflow: **open `/logs`, filter to `error`, read the newest entry,
act on it.** Here is how that plays out for the usual suspects.

### Browser notifications never fire

1. Open `http://localhost:6100/logs`, filter **project = master**, **level =
   error**.
2. No entries, but still no notification? The problem is usually **permission or
   delivery**, not a crash:
   - Confirm the browser/PWA granted notification permission for the hub origin.
   - Confirm the notifier script actually loads: open the hub, and check that
     `http://localhost:6100/hub-notify.js` returns `200` and is present as a
     real `<script>` tag (not inside an HTML comment — that exact bug was fixed
     in 2.8.2).
3. An `error` entry mentioning the service worker or `showNotification` points at
   the delivery path; a stale service worker is the most common cause — hard
   reload to pick up a new one.

### A project will not come online

1. `/logs`, filter to that **project**, level **error**.
2. Look for an `uncaughtException` / `unhandledRejection` — the message names the
   failing call (a missing path, a bad port, a config error).
3. No project entry at all usually means the project's dashboard never started;
   check the `master` folder for a launch error instead.

### The hub overview is blank

1. A blank screen is a **React render error** — it is captured by the error
   boundary. Filter **project = master**, level **error**, and read the newest
   entry; the `message` + `data.stack` point at the component that threw.
2. If the page is blank because of a **stale cached shell**, a hard reload (which
   bypasses the service worker cache) restores it.

### The hub itself crashed

1. `rm` nothing yet — the crash was logged before exit. Open
   `~/.insight-flow/logs/master/error.json` (or `/logs` if the hub restarted) and
   read the last `uncaughtException`.
2. Fix the named cause, then restart with `insight-flow master`.

## See also

- [Troubleshooting & FAQ](./troubleshooting.md) — quick answers for setup and
  everyday problems.
- [Manage many projects with the hub](./multi-project-master.md) — how the master
  hub and per-project dashboards fit together.
