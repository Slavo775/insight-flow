# N17 — Dashboard live-updates miss subfolder writes — recursive watcher needed

**Type:** fix
**Priority:** high
**Created:** 2026-05-22

## Problem

The dashboard does not reflect task changes in real time. `packages/taskflow/src/server/index.ts:109` calls `watch(workDir, { recursive: false })`, which only watches files at the `workTasks/` root (shards + `master.json`). Per-task side files in subfolders (`<taskFolder>/reviews.json`, `<taskFolder>/incidents.json`, `<taskFolder>/TASK.md`, `<taskFolder>/CHECKLIST.md`, `<taskFolder>/REVIEW.md`) NEVER trigger the WS `file-change` event. Reviews, incidents, fix rounds, and doc edits land on disk but the UI keeps showing stale data until the next shard write (or a manual reload). The activity panel and Kanban therefore feel "dead" even while the CLI is mutating state.

## Goal

1. Every CLI mutation that lands on disk under `workDir` causes the dashboard to repaint within ~1 s without manual reload.
2. Side-file writes (`reviews.json`, `incidents.json`) trigger a `file-change` broadcast.
3. Per-task markdown edits (`TASK.md`, `CHECKLIST.md`, `REVIEW.md`) trigger a `file-change` broadcast.
4. Repeated/duplicate fs events are coalesced so the WS does not flood clients.
5. No regression on macOS, Linux, and Windows defaults for `fs.watch`.

## Scope

### In scope

- `packages/taskflow/src/server/index.ts` — replace `watch(workDir, { recursive: false })` with a recursive watch (or per-subdir watch fallback), plus a debounce around `broadcast`.
- The dashboard client in `packages/taskflow/src/server/dashboard.ts` — confirm `loadShard(currentShard)` is sufficient on `file-change`; refetch `master.json` too when current task may have changed.
- Hydration path `hydrateShardJson` already reads side files on demand — no schema change required, just trigger the reload.

### Out of scope

- Activity engine wiring (covered by N18).
- Schema or storage refactor.
- Cross-project aggregation (separate feature task).
- Replacing `fs.watch` with `chokidar` or another dependency — prefer the built-in API. Document the trade-off if portability forces this.

## Implementation plan

1. **Audit current watch behaviour**
   - Reproduce by running `pnpm ui` against the repo root and triggering `insight-flow review-start N16` (or any side-file mutation). Confirm the dashboard does not repaint.
   - Capture which events fire today via a temporary `console.log` inside the watcher callback.
2. **Switch to recursive watch with a fallback**
   - On macOS/Windows, `fs.watch(workDir, { recursive: true })` works natively. On Linux, recursive is unsupported — fall back to walking `workDir` once on boot and registering a watcher per subfolder, plus re-walk when a new task folder appears at the root.
   - Keep the existing root-level watch as the source of truth for shard/master changes.
3. **Debounce broadcasts**
   - Atomic JSON writes can fire 2–3 events per save. Coalesce events inside a 100 ms window: when a fs event arrives, set a timer; reset on each subsequent event; on fire, broadcast a single `{ type: "file-change", data: null }`.
4. **Client refresh both shard and master**
   - In `dashboard.ts` `ws.onmessage` for `file-change`, also re-fetch `/api/work-tasks/master.json` so `currentTaskId` and shard list update if a new shard was minted.
   - Re-render the project-name subtitle from the fresh master payload.
5. **Cleanup on SIGINT**
   - Track all per-subfolder watchers in a `Set`; close each in the existing SIGINT handler so the process exits cleanly.
6. **Smoke test the watcher on each OS path**
   - macOS: run `pnpm ui`, in another terminal touch `workTasks/N16-.../REVIEW.md` and confirm a single `file-change` arrives at the browser.
   - Linux fallback: simulate by setting `process.platform === "linux"` via a wrapper that forces the per-subdir code path; run the same touch test.

## Verification

- Open the dashboard, run `node packages/taskflow/dist/cli.js review-start N16` (or any side-file mutation), and confirm the card status flips within ~1 s with no manual reload.
- `touch workTasks/N16-*/REVIEW.md` → exactly one `file-change` reaches the browser (verify in DevTools Network → WS frames).
- Rapid-fire 5 writes in <100 ms → exactly one `file-change` broadcast (debounce works).
- `Ctrl+C` on the server → process exits within 1 s, no orphaned watchers (verify with `lsof -p <pid>` before kill).
- `pnpm --dir packages/taskflow test` passes.

## Notes

- Related: N02 introduced the WS activity engine; this task fixes the *other* live-update channel (file-change) which has been incomplete since N02.
- Related: N18 covers the activity panel empty-state UX — that task assumes this one is landed so transitions are observable.
- Future: a "task status changed" event derived from diffing shard reads is required by C (browser/desktop notifications) — leave a hook here by emitting structured `file-change` payloads (`{ shard, master }`) so C can compute diffs cheaply.
