# PWA hub epic — Analysis (N212–N217)

_Written for the whole roadmap; N212 is the entry task._

## Problem framing

The user wants a single **PWA** on one localhost (proposed `:6010`) that shows all their insight-flow projects, lets them switch between running instances in one window, and keeps **notifications + sounds** persistent across projects — instead of juggling many dashboards on many ports. Sub-goals raised: improve bulk registration, opt-in during `init`, a health/liveness signal, unified notifications.

## Current state (grounded in code)

- Project dashboard (`insight-flow ui`, :6006) **already push-registers** with master and pushes state/status (`dashboard/server/index.ts` → `/api/register`, `/api/projects/:id/update|status`). Event-driven, not polling.
- Master (:6100): **in-memory** registry (no persistence), server-rendered `/overview`, SSE `/events`, N210 create-project.
- `bulk-ui`: a **second** registry at `~/.insight-flow/batch-ui.json` (paths); spawns child `ui --port 6007+` processes.
- Notifications/sounds: **per-tab, per-project** (`dashboard/client/notifications.ts`, Notification API + Web Audio, localStorage). No service worker, no PWA anywhere.

## Options considered + decisions

1. **Liveness — 10-min timer poll vs on-demand.** Decision: drop the **timer**; use **two complementary signals** — (a) **connection-based** passive liveness (project holds a live socket; drop = offline instantly), plus (b) an **on-demand active healthcheck** where master probes all registered `/health` **only when the user opens the switcher popup or clicks refresh** (no background timer). The user still wants a real healthcheck — just event-triggered, not periodic. → N214 (endpoint + `/health`), N215 (popup-open + refresh triggers).
2. **Shell model — iframe-per-project vs single-origin reverse-proxy.** Cross-port iframes are cross-origin → break one-permission notifications, persistent sounds, and a clean PWA. **Decision (user-confirmed): single-origin reverse-proxy** — master proxies each project at `/p/<id>/*`. → N212 (spike), N215 (shell).
3. **Notifications — Service Worker vs external push (OneSignal/Web Push).** **Decision (user-confirmed): Service Worker + Notifications API only** — fires while open/backgrounded, no external service, local-first. Fully-closed delivery (Web Push/VAPID) explicitly out. → N216.
4. **Registries — two vs one.** Decision: **one persistent source of truth** (fold `batch-ui.json` into a master-owned `hub.json`), online derived from live connections. → N213.
5. **Auth — full handshake vs light token.** Decision: **light per-project token** (issued at register, echoed on calls); servers are loopback-only (N210), so no heavy handshake. → N214.
6. **Ports.** Assign a free port per project, persisted; under the proxy the port is invisible to the user. → N213.

## Roadmap (dependency chain 0→5)

- **N212 (P0)** Reverse-proxy spike — prove master serves a project dashboard + SSE on one origin. _Gates N215._
- **N213 (P1)** Unified persistent registry + `init` opt-in. _Independent backend win._
- **N214 (P2)** Connection-based liveness + light token. _Depends N213._
- **N215 (P3)** Master single-origin app shell: switcher + proxy `/p/<id>` + start-and-go. _Depends N212, N213, N214._
- **N216 (P4)** Unified notifications + sounds via service worker. _Depends N215._
- **N217 (P5)** Installable PWA (manifest + offline shell). _Depends N215, N216._

Suggested order: **N212 → N213 → N214 → N215 → N216 → N217.** N212 (spike) and N213 (registry) can even go in parallel; N212 must land before N215.

## Open questions

- Hub port: `:6010` proposed — confirm at N215 (distinct from :6006 ui / :6100 master).
- Master shell app: new small React app vs reusing the dashboard client's stack — decide at N215.
- Vite PWA: `vite-plugin-pwa` vs hand-rolled SW — decide at N216/N217.
- Whether the per-project dashboard keeps its own standalone notifications (for direct use) alongside the hub's unified ones.

## Sources

- `master/server.ts`, `master/registry.ts`, `master/overview.ts`; `dashboard/server/index.ts` (register/push); `cli/commands/batch-ui.ts`; `core/global-config.ts` (`batch-ui.json`); `dashboard/client/notifications.ts`.

## Handoff brief

6 tasks N212–N217, all `feat`. Build the reverse-proxy single-origin hub, make the registry persistent + init opt-in, connection-based liveness, a React app shell with a project switcher + proxy + start-and-go, then unified SW notifications, then installable PWA. Implement step by step in dependency order.
