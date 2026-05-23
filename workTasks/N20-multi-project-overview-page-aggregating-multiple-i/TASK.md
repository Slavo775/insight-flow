# N20 — Multi-project overview page aggregating multiple insight-flow servers

**Type:** feat
**Priority:** high
**Created:** 2026-05-23
**Modified:** 2026-05-23

## Problem

`insight-flow ui` serves a dashboard for a single project. Running multiple projects in parallel means N tabs, no aggregate view, and no way to glance at "which project needs my attention right now".

The browser-connects-to-each-server approach was discarded: the browser has no way to discover which ports are in use, and manual `~/.insight-flow/projects.json` maintenance is fragile. The correct model is a **push-based master server** (Observer pattern): project servers self-register with the master and push state updates to it. The master holds a live in-memory registry and serves the overview UI. Project servers never need to know about each other.

## Goal

1. A **master server** (`insight-flow master` command, default port 6000) holds an in-memory registry of registered project servers and serves `GET /overview`.
2. `insight-flow ui` (non-standalone) auto-starts the master if not already running, then registers the project server with it.
3. Project servers push their current state to the master on every file-change event via HTTP POST.
4. The master's `/overview` page renders a live card grid — one card per registered project — via a single WebSocket connection to the master.
5. Each project server's `GET /overview` returns an iframe pointing to the master's `/overview`.
6. If the master is unreachable at startup or the project is configured `standalone`, the project server runs normally with no master interaction.
7. If the master restarts (losing its in-memory registry), project servers detect the 401 on their next push and automatically re-register without any user action.

## Scope

### In scope

**New files:**
- `packages/taskflow/src/server/master.ts` — master HTTP + Socket.IO server; in-memory registry; registration + push endpoints; `/overview` route; lock file helpers.
- `packages/taskflow/src/server/overview.ts` — `getOverviewHtml(projects)` returning a complete self-contained HTML+JS page.
- `packages/taskflow/src/commands/master.ts` — `master` CLI command; manages lock file; starts master server.

**Modified files:**
- `packages/taskflow/src/server/index.ts` — auto-start master on startup (non-standalone), register, push state on file-change, serve iframe at `GET /overview`.
- `packages/taskflow/src/types.ts` — add `MasterConfig`, `MasterProjectEntry`, `MasterProjectState`; add `master?: MasterConfig` to `TaskflowConfig`.
- `packages/taskflow/src/schema/index.ts` — add `MasterConfigSchema` (Zod).
- `packages/taskflow/src/cli.ts` — add `master` command dispatch.
- `packages/taskflow/README.md` — "Multi-project overview" section.

**Lock file:** `~/.insight-flow/master.lock` → `{ pid, port, startedAt }`. Written when master starts; used to detect an already-running master. On startup, if PID is dead the lock is stale and cleared.

**Config (`taskflow.config.json`):**
```jsonc
{
  "master": {
    "url": "http://localhost:6000",  // where project server registers + pushes
    "standalone": false              // true = skip master entirely
  }
}
```
If the `master` block is absent and `standalone` is not set, the default behaviour is to attempt master auto-start at `http://localhost:6000`.

### Out of scope

- Persisting the master registry to disk (in-memory only for v1; Redis or file-based store is a future task).
- Cross-host / cross-machine setups (localhost only for v1).
- Adding/removing projects from the overview UI (registration is fully automatic via server startup).
- Bidirectional control from overview (no triggering CLI actions from the page).
- `?projects=` query string override (replaced by push-based auto-discovery; no longer needed).

## Implementation plan

1. **Types + Schema.**
   - `types.ts`: add `MasterConfig { url?: string; port?: number; standalone?: boolean }`, `MasterProjectState { currentTaskId: string | null; taskCounts: Record<string, number>; recentActivity: ActivityEvent[] }`, `MasterProjectEntry { id: string; label: string; url: string; registeredAt: string; lastSeenAt: string; state: MasterProjectState }`. Add `master?: MasterConfig` to `TaskflowConfig`.
   - `schema/index.ts`: add `MasterConfigSchema` (all fields optional).

2. **Master server (`server/master.ts`).**
   - HTTP + Socket.IO server (default port 6000).
   - In-memory `Map<string, MasterProjectEntry>` (UUID keys).
   - `POST /api/register` — body `{ label, url }` → generate UUID, store entry, return `{ id }`.
   - `POST /api/projects/:id/update` — body `MasterProjectState` → 401 if id unknown; otherwise update entry + `lastSeenAt`, emit `project-update` via Socket.IO to all connected browsers.
   - `GET /overview` → `getOverviewHtml([...registry.values()])`.
   - Socket.IO path `/socket.io` (browsers connect here for live card updates).
   - Exports: `startMasterServer(port)`, `readMasterLock`, `writeMasterLock`, `clearMasterLock`, `checkMasterPidAlive`.

3. **`insight-flow master` command (`commands/master.ts`).**
   - Read lock file: if PID alive → print "Master already running on port X" and exit cleanly.
   - If PID dead or absent → clear stale lock.
   - Call `startMasterServer(port)` → write lock `{ pid: process.pid, port, startedAt }`.
   - On SIGINT/SIGTERM → `clearMasterLock()` + exit.

4. **Auto-start + registration in project server (`server/index.ts`).**
   - Add `setupMasterIntegration(config)` called from `startServer()` when `!config.master?.standalone`.
   - Logic: read lock file → if PID dead or absent → start master in-process via `startMasterServer(config.master.port ?? 6000)`, write lock with own PID → POST `/api/register` with `{ label: config.projectName, url: "http://localhost:<port>" }` → store returned `id`.
   - `pushToMaster(id, state)`: `POST <master.url>/api/projects/:id/update` → on 401: re-call `POST /api/register`, update stored id, retry once.
   - `buildProjectState(config)`: reads master.json + current shard → returns `MasterProjectState` (currentTaskId, per-status task counts, last 50 activity events if ActivityEngine is enabled).
   - Wire `pushToMaster` into the existing file-change debounce handler (fires after the `file-change` Socket.IO broadcast to the project's own browser clients).
   - `GET /overview` route: if standalone/no master config → `404 "Overview not available in standalone mode"`; otherwise serve minimal HTML with `<iframe src="<master.url>/overview" style="width:100%;height:100vh;border:none;display:block" />`.

5. **Overview HTML (`server/overview.ts`).**
   - `getOverviewHtml(projects: MasterProjectEntry[])` → complete self-contained HTML+JS (no external deps beyond Socket.IO client from same origin).
   - Top bar: total project count + live count.
   - Responsive flex-wrap grid; each card (~320 px): label + connection badge, current task (id + truncated title + status badge), per-status count row, latest activity line, "Open dashboard" link to `project.url`.
   - Connection badge logic (JS): `lastSeenAt` diff > 60 s → "stale" (yellow), > 120 s → "down" (red); fresh → "live" (green).
   - Browser JS: connect to master's Socket.IO (same origin, no cross-origin); on `project-update` event re-render the affected card by id.
   - N19 notification integration: same diff-and-fire pattern as `dashboard.ts`; title `<label>: <taskId> → <status>`; reads same `localStorage` notification-settings key (`tf-notif-*`).
   - CSS: inline the same dark-theme CSS variables from `dashboard.ts` (no shared module for v1).

6. **CLI router (`cli.ts`).**
   - Add `case "master":` → import and call `commands/master.ts`.

7. **README.**
   - "Multi-project overview" section: how it works, `insight-flow master` for a persistent master, `standalone` config option, expected URLs.

## Verification

- `pnpm --dir packages/taskflow run typecheck && pnpm --dir packages/taskflow run build && pnpm --dir packages/taskflow test` all pass.
- Manual A: start two `insight-flow ui` instances against different repos (ports 6006, 6007). Master auto-starts on first launch. Both register. Open `http://localhost:6000/overview` — two cards with correct labels and current tasks.
- Manual B: trigger a status change via CLI in either project; the corresponding card repaints within ~1 s; OS notification fires with the correct project label.
- Manual C: kill one project server; within 120 s the card badge shows "down"; the other card keeps updating normally.
- Manual D: restart the killed server; it re-registers and the card recovers.
- Manual E: kill master server; project servers log push failure silently; `insight-flow ui` on next project start auto-restarts master, project re-registers, overview recovers.
- Manual F: set `master.standalone: true` in `taskflow.config.json`; `insight-flow ui` starts normally; `GET /overview` returns 404; no master process is started.
- Manual G: master restarts while project servers are running; next file-change push returns 401; project server re-registers silently, push succeeds, card recovers — no user intervention needed.

## Notes

- Related: N17 (Socket.IO) — CORS `*` already set; cross-origin iframe is permitted.
- Related: N19 (browser notifications) — notification title format `<label>: <taskId> → <status>` reuses N19's plumbing; extract a small helper rather than copy-pasting the diff logic.
- Related: N21 (richer activity feed) — `recentActivity` on `MasterProjectState` is forward-compatible; N21 adds richer events, the card just renders the latest entry's text.
- Lock file dir `~/.insight-flow/` — create with `fs.mkdirSync(..., { recursive: true })`.
- In-process master start means master shares the project server's PID. `insight-flow master` gives master its own PID and is the right choice for keeping the overview alive across project server restarts.
