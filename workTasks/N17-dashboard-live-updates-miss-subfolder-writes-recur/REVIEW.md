# N17 — Dashboard live-updates miss subfolder writes — recursive watcher needed — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-22
**PR:** https://github.com/Slavo775/insight-flow/pull/11
**Verdict:** approved

## Summary

`packages/taskflow/src/server/index.ts` swaps the old `watch(workDir, { recursive: false })` for a new `watchWorkDir()` helper that uses native recursive watching on darwin/win32 and a per-subdir fallback on linux. A 100 ms debounce coalesces fs-event bursts into one WS broadcast. The dashboard's `file-change` handler now re-runs `loadShardIndex()` and re-reads `master.json` so `currentTaskId` and shard list stay current. SIGINT closes every registered watcher and clears the debounce timer. Risk is low: the change is local to the server boot path, behind the existing WS contract, and was live-verified on macOS (snapshot + one `file-change` from a touch + one from a burst of five). The linux fallback ships untested on linux but is gated on `process.platform` so it cannot affect the verified macOS path.

## Checklist verification

- [x] Recursive watch on macOS/Windows; per-subdir fallback on Linux — `server/index.ts` `watchWorkDir()` branches on `process.platform`, uses `watch(workDir, { recursive: true })` for darwin/win32 and a per-subdir map for linux that gets refreshed by `refreshSubdirs()` on every root rename.
- [x] Side-file edits trigger `file-change` — verified live: `touch workTasks/N17-.../REVIEW.md` produced exactly one frame (smoke test in commit message).
- [x] 100 ms debounce — `WATCH_DEBOUNCE_MS = 100` + `scheduleFileChangeBroadcast()` clears + re-arms a `setTimeout` so a burst of 5 touches coalesces into 1 frame (verified live).
- [x] Client re-fetches `master.json` on `file-change` — `dashboard.ts` `ws.onmessage` calls `loadShardIndex().then(() => loadShard(currentShard))`; `loadShard()` now refetches `/api/work-tasks/master.json` and updates the subtitle with `current <id>`.
- [x] SIGINT closes every watcher — `watchWorkDir()` returns a `close()` that drains the `Set<FSWatcher>`; SIGINT also clears the pending debounce timer (verified: port released, log unlinked, process exited).
- [x] New task folder picked up by Linux fallback — `refreshSubdirs()` is called on every root-level fs event and diffs the live subdir list against `subdirWatchers`, attaching watchers for newcomers and detaching for removed ones.

## Blockers

_None._

## Non-blocking

1. **No automated test for the watcher.** Verification is manual-only (live smoke). A `node:test` case that constructs a `watchWorkDir()` against a `mkdtemp`'d dir, touches a side file, and asserts the callback fired once within 200 ms would lock down the debounce + side-file behaviour. Mark for a follow-up; not required to approve since the live smoke clearly passes.
2. **No `error` listener on the constructed watchers.** `server/index.ts:107` wraps the recursive `watch()` in try/catch but a runtime `error` event emitted after construction is unhandled. Attaching `w.on("error", (e) => console.error("watcher error", e))` would prevent a silent dead-watcher from making the dashboard go stale without any signal. Same applies to the per-subdir watchers inside `refreshSubdirs()`.
3. **`refreshSubdirs()` runs on every root event, not only renames.** Cheap (`readdirSync` of a small folder) but technically wasted work on shard-file writes. If you ever move to a project with hundreds of task folders, gate it on event `type === "rename"` from the watcher callback.

## Security & edge cases

- Per-subdir watchers can leak handles if `watch()` throws after the watcher is partially constructed. The current code's try/catch around each subdir is sufficient; just noting for future maintainers.
- `master.json` content is now displayed in the subtitle (`current <id>`). The id is text from a trusted server-side file, so no XSS concern, but the subtitle still uses `textContent` which is correct.

## Notes

- Linux fallback was implemented but not exercised on linux. If a CI matrix is added later, run the smoke against an ubuntu-latest runner to close that gap.
- This task is the prerequisite for the future browser/desktop-notifications feature (proposed C in the planning discussion): the now-reliable `file-change` event is what a notification client would diff against.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-22
**Verdict:** fix-needed

### Summary

Human dogfooded the dashboard from mobile Safari at `http://192.168.0.77:6006` after `insight-flow init` at the repo root. Their exact words:

> *"still do not see live updates on url http://192.168.0.77:6006 on mobile safari"*

Follow-up answers:

- **Live-dot color**: **yellow (reconnecting)** — the WS is flapping, not staying connected.
- **Mutation while watching**: tried mutating a task while watching mobile; *"Nothing change on mobile but I bet is same for pc"* — strong suspicion the desktop browser is hit by the same root cause once the WS gets dropped.

Server-side check confirmed the WS handshake itself works (snapshot delivered, frames over LAN IP fine), so this is **client/protocol drift after handshake**, not a routing or firewall problem.

**Desktop Chrome confirms the human's suspicion is correct.** Reproduced by the human at `http://localhost:6006`: the live-dot flashes **green briefly, then turns yellow**, then DevTools Console fills with `WebSocket connection to 'ws://localhost:6006/ws' failed:` in a tight loop (screenshot attached: stack of ~10 identical errors at `(index):433` which is the `connectWS()` site in the bundled dashboard JS). So the bug is **not iOS-specific** — desktop Chrome hits the same WS lifecycle defect, just harder (every reconnect attempt fails outright rather than reconnecting briefly and dying again). A synthetic Node WS client mimicking Chrome's headers stays connected past 30 s against the same server, so the server is not killing connections from its side — something is going wrong specifically with the reconnect cycle in real browsers.

### Blockers

1. **No WebSocket keep-alive ping from the server — iOS Safari kills the connection within ~30 s of idle, the dashboard stays yellow forever.**
   - **Why**: `packages/taskflow/src/server/index.ts` and `packages/taskflow/src/server/ws.ts` contain zero ping/pong emission (grep for `ping|keepalive|heartbeat` returns nothing). iOS Safari aggressively closes idle WS connections. The dashboard then reconnects via `dashboard.ts:458 setTimeout(connectWS, 3000)`, but the cycle repeats so the live-dot stays yellow.
   - **Fix**: in `packages/taskflow/src/server/index.ts`, after each `wsClients.add(client)`, start a `setInterval(() => sendPingFrame(client), 25000)` (25 s — comfortably below Safari's idle window). Store the interval per client and `clearInterval` in the existing `client.onClose(...)` handler. Implement `sendPingFrame` in `ws.ts` (opcode `0x89` — FIN + ping, empty payload) or piggyback a tiny text frame like `{"type":"keepalive"}` the client already ignores. Verify by leaving the mobile tab open for two minutes and confirming the live-dot stays green.
2. **WS reconnect never refetches state — anything that happened during the disconnect is silently lost.**
   - **Why**: `dashboard.ts:450 ws.onopen` only sets `wsConnected = true` and the status dot. It does not call `loadShardIndex()` / `loadShard(currentShard)`. So even with a fixed heartbeat, *any* future Safari background-suspend (or laptop sleep, lost Wi-Fi, etc.) leaves the page with stale data until the next reload.
   - **Fix**: in `dashboard.ts` `ws.onopen`, additionally invoke the same recovery the `file-change` handler does:
     ```js
     loadShardIndex().then(function() {
       if (currentShard) return loadShard(currentShard);
     });
     ```
     Gate on a `hasSyncedOnce` flag to skip the redundant fetch on the very first open (where the initial page load already did it).
3. **Real-browser WS reconnect is broken — desktop Chrome also fails (confirmed).**
   - **Why**: the human reproduced on desktop Chrome at `http://localhost:6006`. Dot turns green for a moment, then yellow, then `WebSocket connection to 'ws://localhost:6006/ws' failed:` repeats in DevTools Console indefinitely. A Node client mimicking Chrome's headers (Origin, User-Agent, Sec-WebSocket-Extensions, etc.) holds the same connection past 30 s without issue, so the server is honouring real-browser handshakes — the failure is on **subsequent reconnects** triggered by the dashboard's `setTimeout(connectWS, 3000)` loop. Possible root causes to investigate during fix:
     - The dashboard's `ws.onerror = function() { ws.close(); }` (`dashboard.ts:476`) may interact badly with the reconnect timer when `onerror` and `onclose` both fire — could leave a stale `ws` reference or trigger redundant reconnects on top of one already-pending connection.
     - The server's WS frame parser in `ws.ts` calls `socket.destroy()` on a client CLOSE frame instead of replying with a CLOSE frame; an abrupt teardown can leave Chrome's WS state machine flagging an error even though we intended a clean close. RFC 6455 §5.5.1 requires the server to reply with a CLOSE before destroying the socket.
     - No `error` handler on the upgraded `socket` itself in `ws.ts` — if a TCP-level error fires post-upgrade it gets bubbled to Node's uncaught handler.
     - Possibly: macOS firewall / NAT path is dropping idle TCP at ~30 s on real-browser sockets (different connection-tracking than the synthetic Node client). Heartbeat ping (blocker 1) would mask this regardless of which sub-cause is real.
   - **Fix**: address blockers 1 + 2 first (heartbeat + re-fetch on reconnect), then with the dashboard left idle in desktop Chrome for 2 minutes and a CLI-triggered mutation, confirm the Kanban repaints and DevTools Console is silent. Also: server should reply with a proper CLOSE frame (`0x88` + 2-byte status code) before `socket.destroy()` in `ws.ts` `processBuffer()`'s `opcode === 0x8` branch.

### Non-blocking

_(none from human round; the round-1 AI non-blocking notes still stand.)_

### Notes

- The round-1 AI review was over-confident: the live verification only used a synthetic Node WS client which would never time out on idle. A real-browser verification step (Chrome + mobile Safari, watch the live-dot for 2 minutes) belongs in the next round of CHECKLIST verification.
- This blocker re-opens N17 specifically (not N18). Branch is shared, so the fix lands on `fix/N17-N18-dashboard-live-updates-and-activity-empty-state` alongside N18.
