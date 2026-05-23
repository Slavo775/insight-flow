# N20 — Multi-project overview page aggregating multiple insight-flow servers

**Type:** feat
**Priority:** high
**Created:** 2026-05-23
**Modified:** 2026-05-23 (rev 2)

## Problem

`insight-flow ui` serves a dashboard for a single project. Running multiple projects in parallel means N tabs, no aggregate view, and no way to glance at "which project needs my attention right now".

The browser-connects-to-each-server approach was discarded: the browser has no way to discover which ports are in use, and manual `~/.insight-flow/projects.json` maintenance is fragile. The correct model is a **push-based master server** (Observer pattern): project servers self-register with the master and push state updates to it. The master holds a live in-memory registry and serves the overview UI. Project servers never need to know about each other.

## Goal

1. A **master server** — a new standalone package `packages/insight-flow-master` in this repo — holds an in-memory registry of registered project servers and serves `GET /overview`. Runs as `insight-flow-master` (default port 6000).
2. `insight-flow ui` (non-standalone, `startMasterLocally: true`) auto-starts the master locally if not already running, then registers the project server with it. When `startMasterLocally: false`, the project server skips auto-start and just registers with the configured remote URL.
3. Project servers push their current state to the master on every file-change event via HTTP POST.
4. The master's `/overview` page renders a live card grid — one card per registered project — via a single WebSocket connection to the master.
5. Each project server's `GET /overview` returns an iframe pointing to the master's `/overview`.
6. If the master is unreachable at startup or the project is configured `standalone`, the project server runs normally with no master interaction.
7. If the master restarts (losing its in-memory registry), project servers detect the 401 on their next push and automatically re-register without any user action.

## Scope

### In scope

**New package `packages/insight-flow-master/` (standalone workspace package):**
- `src/index.ts` — CLI entry point; parses `--port`; manages lock file; starts server.
- `src/server.ts` — HTTP + Socket.IO server; `POST /api/register`; `POST /api/projects/:id/update`; `GET /overview`.
- `src/overview.ts` — `getOverviewHtml(projects)` returning complete self-contained HTML+JS.
- `src/registry.ts` — in-memory `Map<id, MasterProjectEntry>`; `register()`, `update()`, `getAll()`.
- `src/lock.ts` — `readMasterLock`, `writeMasterLock`, `clearMasterLock`, `checkMasterPidAlive` (lock at `~/.insight-flow/master.lock`).
- `src/types.ts` — `MasterProjectEntry`, `MasterProjectState` types (owned by this package).
- `package.json` — name `insight-flow-master`; bin `insight-flow-master`; pnpm workspace sibling of `packages/taskflow`.
- `tsconfig.json`, `tsup.config.ts` — same build pattern as `packages/taskflow`.
- `README.md` — standalone usage + remote deployment notes.

**Modified files in `packages/taskflow`:**
- `src/server/index.ts` — auto-start master (if `startMasterLocally: true` and not standalone), register, push state on file-change, serve iframe at `GET /overview`.
- `src/types.ts` — add `MasterConfig`; add `master?: MasterConfig` to `TaskflowConfig`. No dependency on `insight-flow-master` types — push body is plain JSON, no shared type import needed.
- `src/schema/index.ts` — add `MasterConfigSchema` (Zod).
- `README.md` — "Multi-project overview" section.

**Lock file:** `~/.insight-flow/master.lock` → `{ pid, port, startedAt }`. Written by `insight-flow-master` or by `packages/taskflow` when it auto-starts master in-process. Stale if PID dead → cleared on next startup.

**Config (`taskflow.config.json`):**
```jsonc
{
  "master": {
    "url": "http://localhost:6000",  // where project server registers + pushes
    "standalone": false,             // true = skip master entirely, no register
    "startMasterLocally": true       // false = never auto-start; just register with url (remote master case)
  }
}
```
If the `master` block is absent, defaults apply: `standalone: false`, `startMasterLocally: true`, `url: "http://localhost:6000"`.
Setting `startMasterLocally: false` with a remote `url` supports a master running on a different machine — project server will try to register with that URL and silently skip if unreachable.

### Out of scope

- Persisting the master registry to disk (in-memory only for v1; Redis or file-based store is a future task).
- Adding/removing projects from the overview UI (registration is fully automatic via server startup).
- Bidirectional control from overview (no triggering CLI actions from the page).
- `?projects=` query string override (replaced by push-based auto-discovery; no longer needed).

## Implementation plan

1. **Scaffold `packages/insight-flow-master/`.**
   - `package.json`: name `insight-flow-master`, version `0.1.0`, bin `{ "insight-flow-master": "dist/index.js" }`, deps: `socket.io`, `uuid`; devDeps mirror `packages/taskflow`.
   - `tsconfig.json` + `tsup.config.ts`: same build pattern as `packages/taskflow` (single ESM+CJS bundle, target Node 18).
   - Add to pnpm workspace `pnpm-workspace.yaml` if not already covered by `packages/*` glob.

2. **Types in `packages/insight-flow-master/src/types.ts`.**
   - `MasterProjectState { currentTaskId: string | null; taskCounts: Record<string, number>; recentActivity: object[] }`.
   - `MasterProjectEntry { id: string; label: string; url: string; registeredAt: string; lastSeenAt: string; state: MasterProjectState }`.

3. **Registry (`src/registry.ts`).**
   - `Map<string, MasterProjectEntry>` module singleton.
   - `register(label, url): string` — generate UUID v4, store, return id.
   - `update(id, state): boolean` — update entry + `lastSeenAt`; return false (→ 401) if id unknown.
   - `getAll(): MasterProjectEntry[]`.

4. **Lock file helpers (`src/lock.ts`).**
   - Lock path: `~/.insight-flow/master.lock` (create dir with `fs.mkdirSync(..., { recursive: true })`).
   - `readMasterLock(): { pid, port } | null`.
   - `writeMasterLock(pid, port)`.
   - `clearMasterLock()`.
   - `checkMasterPidAlive(pid): boolean` — `process.kill(pid, 0)` with try/catch.

5. **Server (`src/server.ts`).**
   - HTTP + Socket.IO (default port 6000).
   - `POST /api/register` — `{ label, url }` → `registry.register()` → `{ id }`.
   - `POST /api/projects/:id/update` — `MasterProjectState` body → `registry.update()` → 401 if false; on success emit `project-update` to all browser sockets.
   - `GET /overview` → `getOverviewHtml(registry.getAll())`.
   - CORS `*` on all routes (matches `packages/taskflow` pattern from N17).
   - Export `startMasterServer(port): Promise<{ close(): void }>`.

6. **Overview HTML (`src/overview.ts`).**
   - `getOverviewHtml(projects: MasterProjectEntry[])` → self-contained HTML+JS string.
   - Top bar: total projects + live count.
   - Flex-wrap card grid (~320 px per card): label + connection badge, current task (id + truncated title + status badge), per-status count row, latest activity line, "Open dashboard" link to `project.url`.
   - Badge timing (JS): `lastSeenAt` diff > 60 s → "stale" (yellow), > 120 s → "down" (red); fresh → "live" (green).
   - Browser JS: connect to master Socket.IO (same origin); on `project-update` re-render card by id.
   - N19 notification integration: diff-and-fire on status change; title `<label>: <taskId> → <status>`; reads `tf-notif-*` localStorage settings.
   - CSS: inline dark-theme variables matching `dashboard.ts`.

7. **CLI entry (`src/index.ts`).**
   - Parse `--port` arg (default 6000).
   - Read lock file: if PID alive → print "Master already running on port X" and exit.
   - If stale → `clearMasterLock()`.
   - `startMasterServer(port)` → `writeMasterLock(process.pid, port)`.
   - On SIGINT/SIGTERM → `clearMasterLock()` + exit.

8. **`packages/taskflow` — types + schema.**
   - `src/types.ts`: add `MasterConfig { url?: string; port?: number; standalone?: boolean; startMasterLocally?: boolean }`. Add `master?: MasterConfig` to `TaskflowConfig`. No import from `insight-flow-master` — push body is plain JSON.
   - `src/schema/index.ts`: add `MasterConfigSchema` (all fields optional).

9. **`packages/taskflow` — project server integration (`src/server/index.ts`).**
   - Add `setupMasterIntegration(config)` called from `startServer()` when `!config.master?.standalone`.
   - **If `startMasterLocally !== false`**: read lock file → if PID dead or absent → `startMasterServer(port)` in-process, `writeMasterLock(process.pid, port)`.
   - **Always (non-standalone)**: `POST <master.url>/api/register` → store returned `id`; if unreachable → log warning, skip (project runs fine without master).
   - `pushToMaster(id, state)`: `POST <master.url>/api/projects/:id/update` → on 401: re-register, update id, retry once; on network error: log and skip.
   - `buildProjectState(config)`: master.json + current shard → `MasterProjectState`.
   - Wire `pushToMaster` into the existing file-change debounce (after `file-change` Socket.IO broadcast).
   - `GET /overview`: if standalone/no master config → 404; otherwise `<iframe src="<master.url>/overview" style="width:100%;height:100vh;border:none;display:block" />`.

10. **`packages/taskflow` README.**
    - "Multi-project overview" section: local setup, remote master (`startMasterLocally: false`), `insight-flow-master` standalone binary, `standalone: true` opt-out.

## Verification

- `pnpm --dir packages/taskflow run typecheck && pnpm --dir packages/taskflow run build && pnpm --dir packages/taskflow test` all pass.
- `pnpm --dir packages/insight-flow-master run typecheck && pnpm --dir packages/insight-flow-master run build` passes.
- Manual A: start two `insight-flow ui` instances against different repos (ports 6006, 6007). Master auto-starts on first launch (`startMasterLocally: true`). Both register. Open `http://localhost:6000/overview` — two cards with correct labels and current tasks.
- Manual B: trigger a status change via CLI in either project; the corresponding card repaints within ~1 s; OS notification fires with the correct project label.
- Manual C: kill one project server; within 120 s the card badge shows "down"; the other card keeps updating normally.
- Manual D: restart the killed server; it re-registers and the card recovers.
- Manual E: kill master server; project servers log push failure silently; `insight-flow ui` on next project start auto-restarts master, project re-registers, overview recovers.
- Manual F: set `master.standalone: true` in `taskflow.config.json`; `insight-flow ui` starts normally; `GET /overview` returns 404; no master process is started.
- Manual H: set `startMasterLocally: false` with `url` pointing to a remote host running `insight-flow-master`; `insight-flow ui` registers with the remote, no local master starts; cards appear correctly in the remote `/overview`.
- Manual G: master restarts while project servers are running; next file-change push returns 401; project server re-registers silently, push succeeds, card recovers — no user intervention needed.

## Notes

- Related: N17 (Socket.IO) — CORS `*` already set; cross-origin iframe is permitted.
- Related: N19 (browser notifications) — notification title format `<label>: <taskId> → <status>` reuses N19's plumbing; extract a small helper rather than copy-pasting the diff logic.
- Related: N21 (richer activity feed) — `recentActivity` on `MasterProjectState` is forward-compatible; N21 adds richer events, the card just renders the latest entry's text.
- Lock file dir `~/.insight-flow/` — create with `fs.mkdirSync(..., { recursive: true })`.
- In-process master start (step 9) means master shares the project server's PID. Running `insight-flow-master` as its own process (step 7) is the right choice for keeping the overview alive across project server restarts or when the master is on a remote machine.
- `packages/insight-flow-master` has no dependency on `packages/taskflow` — it is fully standalone. `packages/taskflow` has no dependency on `packages/insight-flow-master` — push payloads are plain JSON. The two packages are decoupled siblings.
