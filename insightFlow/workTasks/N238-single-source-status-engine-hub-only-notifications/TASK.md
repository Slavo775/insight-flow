# N238 — Single-source status engine + hub-only notifications (deterministic + DRY)

**Type:** rework
**Priority:** high
**Created:** 2026-07-15

## Problem

PWA notifications/sounds are unreliable. Root cause is **not** architecture (centralized hub delivery already shipped in N216/N217/N225) but two things:

1. **Fragile status derivation.** `deriveStatus` in `packages/taskflow/src/dashboard/server/event-stream.ts` computes status as `map(single latest event)` with no lifecycle state machine. This produces two live bugs: `SubagentStop → "done"` (statusFromEvent, line 14) flips the whole project to done when a subagent finishes mid-work, and permission state is non-sticky (any later tool event overwrites `awaiting-permission` back to `active`), leaving projects "stuck active" while a permission is pending.
2. **Duplicated notification logic.** The sound/permission/notification code exists three times: `dashboard/client/notifications.ts` (TS), `master/server.ts` `MASTER_NOTIFY_JS` (a served **string blob**), and `master/client/notif.ts`. This already drifted into a bug: `notif.ts` watches **5** statuses but `MASTER_NOTIFY_JS` watches **8**, so three statuses fire with no toggle to disable them.

Decision (from /task-analyze): always-hub access (`:6100`), full state machine, only a real `Stop` = finished, one combined task, silent-when-direct is an accepted documented limitation.

## Goal

1. Status is derived by one deterministic lifecycle state machine living in `core/`, correct for subagents and sticky permission.
2. Notification/sound logic exists **once** — the project-side notifier is deleted; the hub is the only notifier.
3. The `MASTER_NOTIFY_JS` string blob becomes a real built module sharing the core logic; a single `NotifSettings` type + single `WATCHED` list (kills the 5-vs-8 drift bug).
4. Docs recommend the hub and document the intended silent-when-direct limitation.

## Scope

### In scope

- **Phase 1 — engine (`core/`):** new lifecycle state machine module in `packages/taskflow/src/core/`; rewire `dashboard/server/event-stream.ts` (`deriveStatus`/`statusFromEvent`/`EventStore`) to use it. Project server keeps deriving from raw `.claude/hooks` and pushing the result to master.
- **Phase 2 — delete project notifier:** remove notification/sound **firing** from `dashboard/client/notifications.ts` and its callers in `useDashboardStream.ts` / `App.tsx`; drop `underHub()`; remove the project dashboard Sound/Mute UI. Keep the visual badge + `updatePageTitle`.
- **Phase 3 — un-blob hub module:** convert `MASTER_NOTIFY_JS` in `master/server.ts` into a real module in the master client bundle, served at `/hub-notify.js`, importing shared sound/settings/transition logic. One `NotifSettings` + one `WATCHED` list shared with `master/client/notif.ts`.
- **Phase 4 — docs:** README / dashboard docs recommend the hub (`:6100`) and document the silent-when-direct limitation.

### Out of scope

- The event **transport** (SSE + hooks stay as-is).
- Moving status **derivation** to master (raw hooks land on the project server; master stays a consumer).
- Sound autoplay/gesture-unlock and a "test notification" button (separate follow-ups if wanted).
- Reverse-proxy, registry, and LAN/HTTPS work (N223).

## Implementation plan

1. **Define the state machine (`core/`).** Two dimensions: `turn` (`working`⇄`finished`) and sticky `permission` (`none`⇄`pending`). Transitions: `UserPromptSubmit`/`PreToolUse`/`PostToolUse` → working; **main** `Stop` → finished; **`SubagentStop` ignored**; permission signal → pending; next `PreToolUse`/`PostToolUse`/`Stop` clears pending (a plain tool event does **not**). `effective = pending ? "awaiting-permission" : working ? "active" : "idle"`. Idle/pause stays active — only a real `Stop` is finished.
2. **Backstops.** Stuck-active decay (working + no events for N minutes → idle) and `tool_use_id` correlation so subagent tools don't move the main turn.
3. **Rewire `event-stream.ts`.** Replace `deriveStatus`/`statusFromEvent` with the core machine; `EventStore.insert` drives it. Confirm which hook actually delivers the permission signal on the current Claude Code version (`Notification` vs the `PermissionRequest` name in the code) and key off the real one.
4. **Delete project notifier.** Strip firing functions from `notifications.ts` + calls in `useDashboardStream.ts:105–124` / `App.tsx`; remove `underHub()` and the Sound/Mute settings UI; keep badge + title.
5. **Un-blob hub notifier.** Move `MASTER_NOTIFY_JS` logic into a bundled module; extract shared `NotifSettings` + `WATCHED` into one place used by the module and `master/client/notif.ts`; serve the built asset at `/hub-notify.js`.
6. **Docs.** Update README / dashboard docs: hub is the recommended surface; direct/master-down = working-but-silent (intended).

## Verification

- Build: `pnpm build` (CLI + both client bundles) succeeds; `/hub-notify.js` serves the built module (not an inline string).
- Engine: with the hub open, a subagent finishing mid-work does **not** flip the project to done; a pending permission shows `awaiting-permission` and stays until resolved; a real `Stop` → finished notification fires.
- DRY: exactly one `NotifSettings` type and one `WATCHED` list; the settings menu toggles match the statuses the notifier watches (5-vs-8 drift gone).
- Direct project dashboard loads and works with no notifications (intended).

## Notes

- Outcome of `/task-analyze`; see `ANALYSIS.md` in this folder for the full audit trail (options, decisions, sources).
- Related: N216/N217/N225 (hub single-origin + centralized notifications), N223 (LAN/HTTPS), N227 (seeded status push).
- Large combined task by explicit request — CHECKLIST is phased so Phase 1 (engine) can ship alone.
- `claudeStatusFromProjectStatus` (`core/activity-status.ts`) and the registry accept `done`/`awaiting-permission`; strings already align on the hub side, so once the engine emits reliable values, hub notifications work without touching `hub-notify` logic.
