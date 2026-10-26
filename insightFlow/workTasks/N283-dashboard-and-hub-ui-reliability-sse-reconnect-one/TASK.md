# N283 — Dashboard and hub UI reliability — SSE reconnect, one stream per page, store ordering, error boundaries, editor bugs

**Type:** fix
**Priority:** medium
**Created:** 2026-10-19

## Problem

The React apps break in several user-visible ways:

- **Live updates die.** After a project restart behind the hub, the dashboard's live stream stays dead forever (`onerror` never reconnects after the proxy's 502).
- **Too many streams.** The hub page opens two identical `/events` streams, and each proxied tab opens two. About three tabs hit Chrome's 6-connection limit and the next tab hangs.
- **Stuck pages.** A direct link to an older task can stay on "Loading N05…" forever because two shard loads race, and an unknown id never says "not found".
- **Whole-app crashes.** One malformed task blanks the whole app, with no recovery, because there is a single permanent error boundary. One truncated SSE frame throws in the listener.
- **Hub client errors.** The hub client never checks `res.ok`, has no timeouts, swallows errors, never resyncs after reconnecting, and ignores settings changed in the same tab.
- **Flow editor.** It eats spaces while you type, can report a stale node position, and loses an unsaved draft on navigation.
- **Stale or wrong data.**
  - Open documents and flow columns never refresh.
  - The dedupe set grows forever and rows use index keys.
  - "now ago" text.
  - Custom colors turn into `NaN`.
  - The Vite dev proxy misses routes.
- **Small issues.**
  - Install progress from another tab shows in this tab.
  - The node popover can render off-screen.
  - Editable rows use index keys.

Source: `N271/AUDIT.md` **A24, A54, A55, A56, A57, A58, A79** (InstallModal frames, NodePopover, StateRow keys).

## Goal

1. Live streams always recover: reconnect with backoff, and resync after every reconnect.
2. Each page holds at most one long-lived connection per stream URL.
3. Task pages always end in the task or a "not found" message, never an endless "Loading".
4. A render error in one route or panel shows a retry, and the rest of the app keeps working.
5. The hub client reports errors and stays in sync; the listed editor and staleness bugs are fixed.

## Scope

### In scope

- `packages/taskflow/src/dashboard/client/`:
  - `useDashboardStream.ts`, `store.ts`, `api.ts`, `main.tsx`, `ErrorBoundary.tsx`, `App.tsx` (stream / boundary wiring only)
  - `TaskDetailPage.tsx`, `DetailPanel.tsx` (DocViewer deps only), `flow-columns.ts`, `ActivityFeed.tsx`, `ActivityItem.tsx`, `activity.ts`, `ui.tsx` (LifecyclePill / dot colors), `lib.ts`
  - `components/FlowEditor.tsx`, `components/InstallModal.tsx` (frame filtering), `ProjectPage.tsx`
- `packages/taskflow/src/master/client/` — `api.ts`, `App.tsx`, `hub-notify.ts`, `notif.ts`.
- `packages/taskflow/src/dashboard/server/index.ts` — add `kind` + `id` to install / uninstall progress frames (~:1133-1211) only.
- `packages/taskflow/vite.config.ts` — dev proxy list.
- Tests where feasible.

### Out of scope

- Performance (render isolation, memoization, code splitting) and dialog accessibility → N285.
- `mrUrl` link and sanitize schema → N274.
- Server-side SSE or proxy changes → N272 / N282.

## Implementation plan

1. **Reconnect (A24).** In `useDashboardStream`, master `App.tsx` and `hub-notify.ts`: in `onerror`, if `es.readyState === EventSource.CLOSED`, close it and recreate with exponential backoff (1 s → 30 s, reset on open). Call `sync()` / `refreshProjects()` in `onopen` after the first open.
2. **One stream per page (A56).** On the hub overview, `App` stops opening its own `/events` and listens to updates that `hub-notify` re-dispatches (e.g. a `window` `CustomEvent`). If `hub-notify` is absent, `App` falls back to its own stream. `InstallModal` uses the store's existing `/sse` connection instead of opening a new one.
3. **Store ordering (A54a).** Give `loadShard` a request counter or token so a late response can't overwrite a newer one. Add a per-shard cache or a detail-page task slot so `ensureTask` and `sync()` can't evict the viewed task. `TaskDetailPage` shows "Task Nxx not found" when no shard contains it.
4. **Error isolation (A54b, A54c).**
   - Put an `ErrorBoundary` per route (inside the router), keyed by `location.pathname`, with a Retry button. Keep the root boundary as a last resort, also with a reload button.
   - `fetchShard` coerces or validates task fields that the UI iterates (`statusHistory`, `tags`, …), so one bad task can't crash the board.
   - Add one shared `safeParse` for SSE frames in both clients.
5. **Hub client (A55).**
   - Use the dashboard's `apiFetch` (20 s timeout, `res.ok`) in `master/client/api.ts` and delete `json()`.
   - Show an error banner, and show `d.error` when `/start` fails.
   - Never show "No servers online" together with "All servers online".
   - `hub-notify` reloads settings at the top of `onUpdate`, or listens for a custom event fired by `saveNotifSettings`.
6. **Flow editor (A57).**
   - Store the raw "When" text and trim it only in `saveEdgeTrigger`.
   - In `onNodeDragStop`, use the nodes React Flow passes (or a ref).
   - Add `useBlocker` + `beforeunload` while the flow draft is dirty.
7. **Staleness and small defects (A58).**
   - DocViewer refetches on a store sync counter.
   - Keep flows in the store and refetch on `custom-defs-changed`.
   - Rebuild `seen` from the capped list; `key={eventKey(ev)}`; no "ago" after "now".
   - Apply the HEX6 guard (as in `Badge.tsx`) in `LifecyclePill` and the timeline dot.
   - Add `/sse`, `/log` and `/config` to the Vite dev proxy.
8. **Small UI fixes (A79).**
   - Install progress frames carry `kind` + `id`, and `InstallModal` filters by them.
   - Clamp the `NodePopover` position to the viewport.
   - Give editable `StateRow`s a stable client id.
9. **Tests.** There is no DOM test runner. Unit-test the pure pieces: the reconnect backoff helper, the `loadShard` ordering token, `fetchShard` coercion, `safeParse`, the HEX6 color helper. If `/task-analyze` decides a DOM runner is worth adding, raise it with the human first (new dev dependency).

## Verification

- `pnpm --dir packages/taskflow run typecheck` and the tests are green.
- Manual: open a project through the hub, restart that project's dashboard → the dot goes "reconnecting" then "connected", and new task changes appear without a reload.
- Manual: open 4 hub tabs → all load; DevTools shows one `/events` per tab.
- Manual: open `/task/N05` directly (an old shard) → the task loads; `/task/N999` → "not found".
- Manual: break one task in a playground shard (`"statusHistory": "x"`) → the board shows the other tasks.
- Manual: type "the change" in a flow edge "When" field → the space is kept.

## Notes

- Detail and evidence: `N271/AUDIT.md` A24, A54–A58, A79. Stream counts were verified per page type in the audit.
- No hard dependency; can start now. Coordinate with N274 and N285 (both also edit `DetailPanel.tsx`), and run N285 after this task.
- Recommended run: `/task-analyze N283` → `/task-implement N283`.
