# N225 — Hub activity delivery + SW-unified notifications overhaul — Checklist

## Done criteria

- [x] Dashboard advertises its **actual** listening port (runtime pointer `~/.insight-flow/ports/<key>.json`); cleaned up on SIGINT/SIGTERM; stale-pid ignored — `global-config.ts`
- [x] `log-event` POSTs `/log/events` to that real port (fallback `config.server.port`) — `log-event.ts` (fixes the stuck-idle badge + lifecycle delivery)
- [~] Agent-status badge tracks active/idle/permission — expected fixed by the port change; needs live confirm on a hub-started dashboard
- [~] Lifecycle events visible — agent-source `Event` rows now persist in the Agent Activity feed (durable, piece 2a). A **dedicated events tab** (the `event` SSE frame) is NOT added — deferred as polish.
- [x] Activity log no longer wiped on start/shutdown — seeds from the tail (durable), trimmed to `maxEvents` — `activity.ts` + shutdown handler
- [x] No `Skill/completed skill:"unknown"` rows → the Stop hook stays silent when no skill was captured; `BUNDLED_HOOKS_VERSION` 3→4 — `activity-hook.ts`
- [x] Hub notification logic on **every hub page** — shared `/hub-notify.js` (served by the master; valid-JS checked) injected into the overview AND every proxied `/project/<id>/` shell; registers the SW, holds `/events`, fires `swReg.showNotification` — `server.ts` + `overview.ts`
- [x] "Claude is done" fires from a backgrounded hub tab/PWA — `/hub-notify.js` notifies on `claudeStatus` active→done/idle (unblocked by the port fix, which lets the derived status reach the master). *Live confirm pending.*
- [x] Sounds play after a user gesture — `/hub-notify.js` unlocks audio on first click/keydown; Web-Audio fallback
- [~] `done`/`fixed`/`changes-implemented` — added to the hub `WATCHED` list in `/hub-notify.js`. The native `notify-hook.ts` case list + its `/api/agent-done` wrong-port POST are **not** changed (the hub "Claude finished" path via `claudeStatus` covers the primary case; native task-done has an `insight-flow current`-empty limitation). Deferred.
- [x] Project page's foreground `new Notification`/sound retired under the hub — gated on `BASE` in `notifications.ts` (no double-notify)

### Progress note (2026-07-12)
Core delivery/activity fixes **and** the SW-unified notification refactor are implemented + tested (350 green; `/hub-notify.js` validated as clean JS). **Deferred as polish:** a dedicated lifecycle-events tab (2b) and the native `notify-hook.ts` task-done/agent-done-port tweaks. Live confirmation on a hub-started dashboard still pending (needs a global reinstall + hub restart).

## Quality gates

- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes (changed files clean)
- [x] Related tests pass (`npm test` → 350, +1 port-pointer)
- [x] No regressions in affected area
- [ ] Security review (touches `master/server.ts` proxy shell injection — the injected `/hub-notify.js` is a static, non-templated script; confirm no new XSS/CSRF surface)

## Verification

- [ ] Start a project via the hub (non-6006 port) → agent-status badge live + lifecycle feed populates
- [ ] No `COMPLETED /unknown` for a normal (non-slash) turn
- [ ] Hub tab backgrounded (overview or inside a project) → finishing a turn shows a "done" SW notification (+ sound after a gesture)
- [ ] New tests: port-pointer + log-event delivery to the real port; `event`-frame rendered; no-unknown; watch-list additions
- [ ] `npx tsc --noEmit && npm test` green
