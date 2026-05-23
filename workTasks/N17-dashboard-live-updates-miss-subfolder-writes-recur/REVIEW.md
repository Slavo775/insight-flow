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

**Desktop Chrome confirms the human's suspicion is correct — same symptom as mobile.** Reproduced by the human at `http://localhost:6006`. Their exact words:

> *"Okej but I am sure that mobile and desktop has same issue also on desktop is yellow dot"*

So on desktop Chrome the live-dot stays **yellow** (reconnecting) — same as mobile — and DevTools Console fills with `WebSocket connection to 'ws://localhost:6006/ws' failed:` in a tight loop (screenshot: ~10 identical errors at `(index):433`, the `connectWS()` site in the bundled dashboard JS). No transient green phase. This means **`ws.onopen` is never firing in real browsers** — the WS handshake or first frame is being rejected by the browser entirely. A synthetic Node WS client mimicking Chrome's headers (Origin, User-Agent, Sec-WebSocket-Extensions: permessage-deflate, etc.) stays connected past 30 s against the same server and receives the snapshot frame correctly, which makes the server's compliance look fine in isolation — but real browsers see something they reject. The defect is consistent across both surfaces, not browser-specific.

**Incognito Chrome reproduces** (screenshot attached) — rules out extensions, ad-blockers, and any cached state. The bug is fully in our code.

**DevTools Network panel shows "Provisional headers are shown"** for every `ws` request (screenshot attached). Request headers are populated; **response headers are empty**. That phrase in Chrome means Chrome's networking layer never received a response it considered valid.

**Smoking gun (server-side instrumentation):** with a fresh server boot + temporary debug logging on the upgrade handler, every Chrome connect prints:

```
[ws-debug] upgrade /ws ua=Mozilla/5.0 (Macintosh; Intel Mac OS X …) ext=permessage-deflate; client_max_window_bits
[ws-debug] socket error read ECONNRESET
[ws-debug] socket close hadError=true
```

So the upgrade handler IS invoked, we DO write the 101 + snapshot, and **Chrome immediately RSTs the TCP connection** (`ECONNRESET` from the read side). A Node probe sending the *byte-identical* Chrome headers (including `permessage-deflate`) receives the snapshot fine — proving the bytes we emit are spec-legal text, but Chrome browser specifically aborts after seeing them. Something in the combination of (response headers we emit) × (first frame we send before any client read) × (Chrome 148's WS state machine) is interpreted as a protocol violation worthy of `RST` rather than a clean `close`.

### Blockers

1. **Real-browser WebSocket connection rejected — Chrome sends `RST` immediately after receiving our 101 + first frame. `ws.onopen` never fires on either desktop Chrome or mobile Safari.**
   - **Why**: server-side instrumentation confirms the upgrade handler IS invoked, we DO write the 101 response + the snapshot frame, but Chrome immediately resets the connection (`ECONNRESET` on the server's read side, `hadError=true` on close). A Node client sending the byte-identical Chrome request headers (`Origin`, `User-Agent`, `Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits`, etc.) receives the snapshot frame correctly against the same server — so the bytes we emit are spec-legal WS, but real browsers reject them.
   - **Two most likely root causes** (only confirmable by inspecting wire bytes / experimenting):
     - **(a) First frame sent in the same TCP segment as the 101 response**. `server/index.ts` calls `handleUpgrade(req, socket, head)` which `socket.write`s the 101, then immediately calls `client.send(JSON.stringify(snapshot))` which `socket.write`s the WS frame. Node's TCP layer with Nagle's algorithm may coalesce both into one segment. Chrome 148's WS state machine may see "frame data immediately after handshake headers" as a state transition violation and `RST`. Quick experiment: `setImmediate(() => client.send(...))` to defer the frame send to the next tick.
     - **(b) Hand-rolled `ws.ts` is missing edge-case handling expected by modern Chrome**. The response headers are minimal-compliant per RFC 6455 §4.2.2, but Chrome's implementation has been hardened over the years against subtle bugs that hand-rolled servers commonly hit (e.g., incorrect handling of `Sec-WebSocket-Extensions` offer, missing `Sec-WebSocket-Protocol` echo when client offered one, padding/whitespace in headers). Our `ws.ts` was custom-written specifically to avoid an npm dependency.
   - **Recommended fix**: **swap the hand-rolled `ws.ts` for the `ws` npm package** (~50 KB, the de-facto Node WS implementation, ~10M+ downloads/week, used by Express, Socket.io, etc.). Single dependency, decades of edge-case fixes. Replace `handleUpgrade` and `WsClient` with `WebSocketServer({ noServer: true })` and `wss.handleUpgrade(...)`. Keep our existing snapshot/broadcast/wsClients logic — only the protocol layer changes. As a quick experiment before the swap, try fix (a) (`setImmediate`); if that alone makes Chrome stop `RST`-ing, we have a one-line fix and skip the dependency. Expected outcome either way: dot stays green, mutations repaint without reload, on both Chrome and mobile Safari.

2. **WS reconnect never refetches state — anything that happened during the disconnect is silently lost.**
   - **Why**: `dashboard.ts:450 ws.onopen` only sets `wsConnected = true` and the status dot. It does not call `loadShardIndex()` / `loadShard(currentShard)`. So even with a fixed handshake, any future disconnect (laptop sleep, Wi-Fi blip, Safari background-suspend) leaves the page with stale data until manual reload.
   - **Fix**: in `dashboard.ts` `ws.onopen`, additionally invoke the same recovery the `file-change` handler does:
     ```js
     loadShardIndex().then(function() {
       if (currentShard) return loadShard(currentShard);
     });
     ```
     Gate on a `hasSyncedOnce` flag to skip the redundant fetch on the very first open (where the initial page load already did it).

3. **No WebSocket keep-alive ping from the server.**
   - **Why**: `packages/taskflow/src/server/index.ts` and `ws.ts` contain zero ping/pong emission (grep for `ping|keepalive|heartbeat` returns nothing). Even once blocker 1 is fixed, iOS Safari aggressively closes idle WS connections (~30–60 s) and NAT path / macOS firewall may drop idle TCP — both cause unnecessary reconnect churn.
   - **Fix**: in `server/index.ts`, after each `wsClients.add(client)`, start a `setInterval(() => sendPingFrame(client), 25000)`. Store the interval per client and `clearInterval` in the existing `client.onClose(...)` handler. Implement `sendPingFrame` in `ws.ts` (opcode `0x89` — FIN + ping, empty payload) or piggyback a tiny text frame like `{"type":"keepalive"}` the client already ignores. Verify by leaving a tab open for two minutes and confirming the live-dot stays green.

4. **Server doesn't reply with a CLOSE frame on client CLOSE — and has no `socket.on("error", …)` handler.**
   - **Why**: `ws.ts` `processBuffer()` handles `opcode === 0x8` by calling `destroy()` which immediately `socket.destroy()`s the TCP socket. RFC 6455 §5.5.1 requires the server to reply with a CLOSE frame (`0x88` + 2-byte status code) before tearing down. Browsers may flag this as an abnormal close and refuse the next reconnect attempt for a short window. Also: no `socket.on("error", ...)` after upgrade means a TCP-level error post-upgrade goes to Node's default handler (which on some setups warns to stderr or crashes the process).
   - **Fix**: in `ws.ts`, on CLOSE frame, first `socket.write(<close-frame: 0x88 0x02 0x03 0xe8>)` (normal closure, status 1000), then end the socket gracefully (`socket.end()` not `destroy()`). Add `socket.on("error", (e) => { destroy(); })` after upgrade.

### Non-blocking

_(none from human round; the round-1 AI non-blocking notes still stand.)_

### Notes

- The round-1 AI review was over-confident: the live verification only used a synthetic Node WS client which would never time out on idle. A real-browser verification step (Chrome + mobile Safari, watch the live-dot for 2 minutes) belongs in the next round of CHECKLIST verification.
- This blocker re-opens N17 specifically (not N18). Branch is shared, so the fix lands on `fix/N17-N18-dashboard-live-updates-and-activity-empty-state` alongside N18.
