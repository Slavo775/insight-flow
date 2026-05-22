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
