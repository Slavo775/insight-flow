# N242–N244 — Analysis (pre-taskmaster audit trail)

Covers the whole debug-logging epic (N242 engine → N243 instrumentation → N244 page). Produced by `/task-analyze`.

## Problem framing

Debugging insight-flow across master + project servers is hard — no central view of errors/warnings/info. The notification saga (N238/N240 + the injection bug) took a full session to trace partly because nothing surfaced the failures. Need a **debug logging engine**: projects + master POST logs to the master, which validates + enriches + stores per-project as JSON, viewable in the hub.

## Goal

A central debug log: `POST /log {key, log}` → validated + enriched + stored under `~/.insight-flow/logs/<project|master>/{error,info,warning}.json` (capped ~1000, throttled trim) → `GET /logs` (per-project / master / all-merged, filter by type, paginated) → a raw-JSON `/logs` page in the master client.

## Options considered (and the challenges resolved with the user)

- **"CDN" as a separate abstraction** → REJECTED. User confirmed it's an internal CLI-package module, not a network CDN. It's one small `log-store.ts`.
- **store/update/get/delete** → CUT `update` (logs are append-only). `delete` = "clear a project's logs".
- **Cleanup: trim-on-write vs 5-min timer** → user chose **throttled cleanup, cap 1000**. Implement as a THROTTLE (at most once per 5 min per file), NOT a debounce — a debounce resets on every write and, under continuous logging, would never fire and grow unbounded.
- **GET all-merged perf / caching** → no real concern (≤ ~30k tiny objects); **skip caching (YAGNI)**, pagination = slice.
- **New key system** → REJECTED. Reuse the existing per-project registration `token` as the key; add `registry.getByToken`. Master uses a reserved `"master"` key.
- **Separate vs reuse activity pipeline** → user confirmed this is a **separate debug channel** (distinct from `log-event`/`events.json`).
- **/logs page location** → a route in the **existing master React client** (raw JSON; Lovable styles later), not a separate app.
- **One task vs phased** → user wants **all tasks created up front**, worked continuously → split into 3 (N242/N243/N244).

## Decision

Three `feat` tasks:
- **N242 (high)** — the engine: `LogEntrySchema` (Zod), `core/log-store.ts` (append/read/clear + throttled trim, 1000 cap), `registry.getByToken`, `recordLog`, `POST /log`, `GET /logs`. Backbone; shippable alone.
- **N243 (high)** — instrumentation: React ErrorBoundary (both clients) → log; server global `uncaughtException`/`unhandledRejection` handlers (master + project); registration-handshake logging (project start/finished + master received/generated).
- **N244 (medium)** — the `/logs` page in the master client (raw JSON, project/type filter, pagination).

Order: N242 → N243 → N244 (each depends on the prior).

## Open questions (for implementation)

- **Client → master log path:** simplest is client → its own project server → forward to master (reuses the key the project server already holds), vs exposing the key to the client. Decide in N243.
- Master's own key: reserved literal `"master"` — confirmed.
- Slug for the per-project folder name: reuse the sha/slug pattern in `global-config.ts` (avoid unsafe path chars from project names).

## Sources

- `packages/taskflow/src/core/global-config.ts` (`getGlobalConfigDir`, slug/hash pattern), `master/registry.ts` (`token`, register), `master/server.ts` (routing, `isTrustedActionRequest`), `core/schema/index.ts` (Zod), `dashboard/server/index.ts` (registration + push).
- User spec + diagram (2026-07-16). "CDN"→CLI-internal module; 1000-cap + 5-min throttled cleanup; /logs in existing master client.

## Handoff brief

Debug logging engine, 3 feat tasks. N242: master `POST /log` + `GET /logs` + `core/log-store.ts` (per-project JSON under `~/.insight-flow/logs/`, 1000 cap, throttled trim), Zod validation, key = registration token (+ `getByToken`), reserved `master` key, shared `recordLog`. N243: error boundaries (client React + server uncaught handlers, master + project) + registration logging. N244: `/logs` raw-JSON page in the master client. Reuse existing token/config/Zod infra; keep the store fs-safe (never crash the server it logs for).
