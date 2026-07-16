# N242 — Debug log engine — master /log + /logs API + log-store (Zod, per-project JSON, throttled trim)

**Type:** feat
**Priority:** high
**Created:** 2026-07-16

## Problem

Debugging insight-flow across the master + project servers is hard — there's no central place to see errors/warnings/info from every project. We need a **debug logging engine** (separate from the activity/event feed): projects (and the master) POST logs to the master, which validates + enriches + stores them per-project as JSON. This is the backbone task — the store + the two HTTP endpoints. Instrumentation (N243) and the viewer page (N244) build on it.

## Goal

1. Projects can `POST /log` to the master with `{ key, log }`; the master validates (Zod), enriches (timestamp + projectName), and stores.
2. Logs persist under `~/.insight-flow/logs/<project|master>/{error,info,warning}.json`, each capped at ~1000 entries.
3. `GET /logs` returns logs for one project, the master, or all-merged (sorted by timestamp), filterable by type + paginated.
4. One shared write path so the master logs its own entries via the same logic (no self-HTTP).

## Scope

### In scope

- **`packages/taskflow/src/core/schema/index.ts`** — add `LogEntrySchema` (Zod): `{ type: "error"|"warning"|"info", message: string, data?: unknown }` (the client payload), and the stored shape `{ ...that, timestamp, projectName }`.
- **`packages/taskflow/src/core/log-store.ts`** (NEW) — the store: dir `getGlobalConfigDir()/logs/<slug>/`, functions `appendLog(project, entry)`, `readLogs(project, type)`, `clearLogs(project)`, `listProjects()`, and a **throttled trim** (keep last ~1000 per file; runs at most once per 5 min per file — a throttle, NOT a debounce, so continuous writes don't starve it). Fire-and-forget writes.
- **`packages/taskflow/src/master/registry.ts`** — add `getByToken(token)` (look up a project by its auth `token`, the "key").
- **`packages/taskflow/src/master/server.ts`** — `POST /log` (parse body, `getByToken(key)` → projectName, or reserved `"master"` key; validate with Zod; enrich; `appendLog`) and `GET /logs?project=<name>|master|all&type=error|warning|info&page=&pageSize=` (read + merge + sort desc by timestamp + paginate). Add a shared `recordLog(key, log)` the master itself calls for its own logs.

### Out of scope

- The error boundaries / registration logging (N243) and the `/logs` page (N244).
- The existing activity/event pipeline (`log-event`, `events.json`) — untouched; this is a separate debug channel.
- Real network CDN / external storage — this is a local CLI-package module.

## Implementation plan

1. **Zod schema.** In `core/schema/index.ts`: `LogInputSchema` (client-sent `{type, message, data?}`) and `StoredLogSchema` (`+ timestamp, projectName`). Export both + inferred types.
2. **log-store module.** `core/log-store.ts`: `logsDir()` = `join(getGlobalConfigDir(), "logs")`; per-project subdir keyed by a slug of the project name (reuse the sha/slug pattern from `global-config.ts`), `master/` for the master. `appendLog`/`readLogs`/`clearLogs`. Throttled trim: track last-trim time per file; on append, if `now - lastTrim > 5min` and length > 1000, slice to last 1000 (fire-and-forget). Guard all fs in try/catch (never throw into the request path).
3. **registry.getByToken.** Return the entry whose `token === key`, else null.
4. **recordLog(key, log).** Resolve project: `key === "master"` → `"master"`; else `getByToken(key)?.projectName`; unknown key → reject. Validate `log` with `LogInputSchema`; build stored entry (`timestamp = new Date().toISOString()`, `projectName`); `appendLog`.
5. **POST /log route.** Loopback/trusted-gated. Read JSON body `{ key, log }`; call `recordLog`; 202 on success, 400 on invalid, 401 on unknown key. Fire-and-forget store (respond fast).
6. **GET /logs route.** Query `project` (a name | `master` | `all`, default `all`), `type` (optional), `page`/`pageSize` (default 1/100). For `all`: read every project's + master's files for the type(s), merge, sort by timestamp desc, slice. Return `{ total, page, pageSize, logs }`.
7. **Tests** — unit-test `log-store` (append + trim cap) and the schema; an integration test for `POST /log` (valid → stored, bad key → 401, bad body → 400) + `GET /logs` (merge/paginate) via `startMasterServer` (mirror `master-liveness.test.mjs`).

## Verification

- `POST /log {key:<token>, log:{type:"error",message:"x"}}` → the entry appears in `~/.insight-flow/logs/<project>/error.json` with a timestamp + projectName.
- `POST /log {key:"master", log:{...}}` → lands in `logs/master/`.
- Append >1000 → after the 5-min throttle window, the file trims to ~1000.
- `GET /logs?project=all&type=error` → merged, newest-first, paginated.
- `pnpm --dir packages/taskflow test` green; typecheck + lint clean.

## Notes

- First of 3 (N242 engine → N243 instrumentation → N244 page). See `ANALYSIS.md`.
- **Reuse:** the registration `token` IS the key (no new key system); `getGlobalConfigDir()` for the dir; Zod in `core/schema`; `isTrustedActionRequest` for the route gate; the slug/hash pattern from `global-config.ts`.
- Throttle, not debounce (a debounce resets on every write → under continuous logging it never fires and the file grows unbounded).
- Keep the store fs-safe: a logging engine must never crash the server it logs for.
