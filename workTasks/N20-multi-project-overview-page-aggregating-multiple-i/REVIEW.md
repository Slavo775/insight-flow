# N20 — Multi-project overview page aggregating multiple insight-flow servers — Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**PR:** https://github.com/Slavo775/insight-flow/pull/13
**Verdict:** fix-needed

## Summary

N20 adds the `insight-flow-master` package (push-based aggregator) and wires project servers to auto-register and push state on every file-change. The overview card grid is served at `/overview` with Socket.IO live updates. Risk: medium — new process spawning, lock-file management, cross-package HTTP communication.

## Human Review — Round 1

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **Port 6000 is blocked by browsers (`ERR_UNSAFE_PORT`)** — Chrome/Chromium (and other browsers based on the same engine) maintain a hardcoded list of "unsafe" ports inherited from legacy protocols. Port 6000 (X11/X Window System) is on that list. The browser refuses to open `http://localhost:6000` with `ERR_UNSAFE_PORT` — no content loads at all.
   - **Fix:** Change the master server default port from `6000` to a safe port (e.g. `6100`). Update default in `packages/insight-flow-master/src/config.ts`, `packages/insight-flow-master/package.json` (if hardcoded), README examples, and any test fixtures.

2. **iframe embed not working** — The `/overview` route in the project server renders an iframe pointing to `http://localhost:6000/overview`. This fails for the same reason as blocker 1 (port blocked), but may also have a secondary issue: the master server may need to set `X-Frame-Options: ALLOWALL` or omit it entirely so browsers permit the iframe embed.
   - **Fix:** Resolve blocker 1 (port change) first. Then verify the iframe loads. If it still fails, add `res.setHeader('X-Frame-Options', 'ALLOWALL')` (or omit the header) on the master's `/overview` route.

### Suggestions (non-blocking)

- Consider documenting the list of browser-blocked ports in README so users know to avoid them when choosing a custom `master.port`.

### Notes

- Exact user quote: "why? also iframe not working" (with screenshot showing `ERR_UNSAFE_PORT` on `http://localhost:6000/overview`)


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **Master binary not built — overview never starts** — `pnpm ui` runs `node packages/taskflow/dist/cli.js ui`, but `packages/insight-flow-master/dist/index.js` doesn't exist until `pnpm --dir packages/insight-flow-master run build` is run separately. `findMasterBin()` in `server/index.ts:195` returns `null` when the binary is missing, so auto-start is silently skipped and registration fails. The root `build:package` script only builds `packages/taskflow`, leaving the master unbuilt after a clean checkout or `git pull`.
   - **Fix:** Add a root `build` script to `package.json` that builds both packages in order: `pnpm --dir packages/insight-flow-master run build && pnpm --dir packages/taskflow run build`. Update `CLAUDE.md` build command to reference the new root `build` script. This ensures a single `pnpm build` from the repo root is sufficient.

### Notes

- User quote: "can we enable overview?" after seeing `[master] insight-flow-master binary not found, skipping auto-start` and `[master] Could not register with master at http://localhost:6100 — overview disabled` in the server startup log.


---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **`findMasterBin()` resolves the wrong path — binary never found even after `pnpm build`** — `server/index.ts:198` uses `resolve(__dir, "../../../insight-flow-master/dist/index.js")`. Starting from `packages/taskflow/dist/`, three `../` steps reach the repo root, so it looks for `<repo-root>/insight-flow-master/dist/index.js` — a path that does not exist. The package lives at `<repo-root>/packages/insight-flow-master/dist/index.js`, which is only two `../` steps away.
   - **Fix:** Change `"../../../insight-flow-master/dist/index.js"` → `"../../insight-flow-master/dist/index.js"` at `packages/taskflow/src/server/index.ts:198`. No config change needed — this is purely a path bug.

### Notes

- User built with `pnpm build` (both packages succeeded) then ran `pnpm ui` and still got "binary not found". Confirmed: correct path is 2 levels up, not 3.
- User asked "should we configure the config?" — no config change needed; the issue is a wrong relative path in source code.


---

## AI Review — Round 4

**Reviewer:** Task Reviewer (AI)
**Date:** 2026-05-23
**Verdict:** approved

### Summary

N20 adds `packages/insight-flow-master` (push-based aggregator, Socket.IO, lock-file managed) and wires project servers to auto-register and push state on file-change. Three human review rounds caught: port 6000 browser-blocked → 6100, root build script missing `insight-flow-master`, and the binary path resolution off-by-one (`../../../` → `../../`). All three were fixed and verified. Risk is medium — new process spawning, cross-process HTTP, lock-file management — but the implementation handles the failure modes correctly (unreachable master logs + skips, 401 triggers silent re-registration, stale lock cleared on startup).

### Checklist verification

- ✅ `package.json`, `tsconfig.json`, `tsup.config.ts` scaffolded in `packages/insight-flow-master`.
- ✅ `src/types.ts`: `MasterProjectEntry`, `MasterProjectState`.
- ✅ `src/config.ts`: `loadMasterConfig()` with Zod validation, defaults `{ port: 6100, standalone: false }` (6100 per human review fix).
- ✅ `src/registry.ts`: `register()`, `update()` (false on unknown id), `getAll()`.
- ✅ `src/lock.ts`: all four helpers; `~/.insight-flow/master.lock`.
- ✅ `src/server.ts`: `POST /api/register` (503 in standalone), `POST /api/projects/:id/update` (401 on unknown id), `GET /overview`, `project-update` Socket.IO broadcast, CORS `*`.
- ✅ `src/overview.ts`: card grid, connection badges (live/stale/down at 60s/120s), N19 notification diff-and-fire, dark-theme CSS matching `dashboard.ts`.
- ✅ `src/index.ts`: config load, `--port` override, stale-lock detection, startup log, SIGINT/SIGTERM cleanup.
- ✅ `MasterConfig` + `master?` on `TaskflowConfig` in `src/types.ts`.
- ✅ `MasterConfigSchema` in `src/schema/index.ts`.
- ✅ `setupMasterIntegration`: auto-start gated on `startMasterLocally !== false`, lock-alive check.
- ✅ Registration with silent skip on unreachable master.
- ✅ Push on every file-change; 401 → re-register + retry once.
- ✅ `GET /overview`: iframe proxy or 404 in standalone.
- ✅ README "Multi-project overview" section with local + remote + both standalone modes.
- ✅ Root `build` script builds master then taskflow (`package.json`).
- ✅ Both packages build and typecheck clean.

### Non-blocking

1. **`detached: false` on spawned master** (`server/index.ts:308`) — With `detached: false` the master child shares the parent's process group. When the spawning project server receives SIGINT/SIGTERM (e.g. `Ctrl+C`), the OS delivers the signal to the entire group, killing the master too. If a second project server is also registered, it loses the overview until it next starts a `pnpm ui` (which re-spawns master). Not critical for single-project use — the re-registration loop covers recovery — but contradicts the spec note about the master surviving project server restarts. Fix: `detached: true` (also remove `child.unref()` since `detached` handles event-loop decoupling).

2. **`recentActivity: object[]`** in `types.ts:MasterProjectState` — `renderActivity` accesses `.action`, `.tool`, `.file` with no type safety. Consider narrowing to `{ tool?: string; action?: string; file?: string }` to match `ActivityEvent` shape.

3. **`config.port = p` mutation in `index.ts:18`** — Mutates the returned config object. Harmless (it's a local value), but unexpected. Prefer `config = { ...config, port: p }` or a local `let port = config.port`.

### Security & edge cases

- HTML injection in overview: all user-supplied strings pass through `escHtml()` before insertion. ✅
- `initialData` JSON-in-JS injection: `<`, `>`, `&` are Unicode-escaped on line 5-7. ✅
- `readBody` error path resolves with `""` — malformed bodies return 400 JSON. ✅
- Master lock collision (two project servers start simultaneously): both see no live PID, both try to spawn master. The second master fails binding to port 6100, never writes a lock, exits. The first master wrote its lock; `waitForMaster` on the second project server succeeds and it registers normally. ✅

### Notes

- `socket.io/socket.io.js` loads from the master's origin (`/socket.io/socket.io.js`). Correct even in iframe context — the iframe document is served from the master, so relative URLs resolve against `localhost:6100`. ✅
- All three human-review blockers (port, root build script, path depth) have been fixed and verified. The implementation is correct and complete for the v1 scope.


---

## Human Review — Round 5

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **Master dies spontaneously — overview breaks without any user action** — Registration succeeded and overview loaded once (200). Shortly after, refreshing `/overview` returned `ERR_CONNECTION_REFUSED` on the iframe src (`http://localhost:6100/overview`) — master process is gone. Project server is still running. Root cause: the spawned master child process uses `detached: false` (`server/index.ts:308`), so it shares the process group with the spawning project server. Any signal that kills the project server's terminal session (e.g. tab close, shell exit, SIGHUP) also kills the master, since they share the same process group. Once dead, the master is never auto-revived — the project server only tries to spawn master once at startup.
   - **Fix:** Change `detached: false` → `detached: true` in the `spawn()` call at `packages/taskflow/src/server/index.ts:308`. Keep `child.unref()` — it prevents Node from waiting for the child on exit, which is correct for a background daemon. With `detached: true`, the master survives the spawning project server's death and continues serving `/overview` until explicitly killed.

### Notes

- User quote: "okej server register to master also overview was on but now [screenshot: ERR_CONNECTION_REFUSED on /overview] and I've done nothing"
- Network tab showed: first `/overview` → 200 (0.5 KB, the iframe wrapper page); second `/overview` → (failed) `net::ERR_CONNECTION_REFUSED` (185 KB, the master's page) — confirms master is dead, project server alive.
- This promotes the AI review's non-blocking item #1 to a confirmed blocker.

### Checklist verification

### Blockers

### Non-blocking

### Security & edge cases

### Notes


---

## Human Review — Round 6

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **Master crashes when Socket.IO makes its polling handshake — unhandled async rejection** — Socket.IO (via engine.io) uses `prependListener` to register its own `request` listener first. When a browser opens the overview page, Socket.IO performs an initial HTTP polling handshake (`GET /socket.io/?EIO=4&transport=polling&t=...`), handles it, and writes the response headers (`res.headersSent = true`). The app's `server.on("request", async ...)` handler also fires for this request. It finds no matching route and falls through to `res.writeHead(404, ...)` on the already-responded socket — throwing `ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client`. Because the handler is `async`, this becomes an unhandled promise rejection, and Node.js v15+ exits the process. This is why the overview works briefly (until the first Socket.IO connection attempt) then crashes.
   - **Fix:** Add `if (res.headersSent) return;` at the top of the `server.on("request", ...)` handler in `packages/insight-flow-master/src/server.ts` (before setting CORS headers). Also wrap the entire handler body in a `try/catch` that logs the error and returns 500 if headers aren't sent — so any future unhandled paths don't crash the process.

### Notes

- User quote: "okej overview works but only a while then crash why?"
- Timing is consistent: crash happens within seconds of opening the overview page in a browser (Socket.IO initiates polling handshake on connect).


---

## Human Review — Round 7 (Final)

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** approved

### Notes

- User quote: "approved! hope it is possible to bundle master server into npm package?"
- Follow-up question about npm bundling: currently `insight-flow-master` is a separate workspace package. When `packages/taskflow` is published to npm, the master binary path (`../../insight-flow-master/dist/index.js`) won't exist in a user's `npm install -g insight-flow` setup — `findMasterBin()` will always return `null` there. Bundling master into the `insight-flow` npm package is the right next step: copy `insight-flow-master/dist/index.js` into `packages/taskflow`'s published files and update `findMasterBin()` to resolve from the installed package root. Worth a dedicated task.
