# N242 — Debug log engine — master /log + /logs API + log-store (Zod, per-project JSON, throttled trim) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-16
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

The engine is well-built and reuses the right infra (registration token as the key, `getGlobalConfigDir`, Zod, the trusted-request gate). Correctness verified on the hard parts: `appendLog` is a single-writer synchronous read-modify-write (no race — only the master calls it), the throttled trim bounds the file correctly, `readMerged` sort (UTC ISO desc) + pagination are correct at all bounds, and the status codes are right. **One blocker: a path traversal in `slugProject`.** Plus a gate-strength hardening. Reviewed with correctness + security subagents; build + 369/369 tests green; no XSS; the registration token is deliberately not logged.

## Checklist verification

- [x] `LogInputSchema` + `StoredLogSchema` (Zod) — pass
- [x] `log-store.ts` append/read/clear/listProjects + per-project JSON — pass (but see Blocker 1: slug safety)
- [x] Throttled trim (1000 cap, ≤ once/5 min/file) — pass (bounds verified; not a debounce)
- [x] fs guarded (never throws into the request path) — pass
- [x] `registry.getByToken` — pass
- [x] `recordLog` shared path — pass
- [x] `POST /log` 202/400/401 — pass (gate strength, NB-1)
- [x] `GET /logs` merge/filter/paginate — pass (moved to `/api/logs` in N244 — endpoint note)
- [x] master logs via `recordLog` (`"master"` key) — pass

## Blockers

1. **MEDIUM — path traversal in `slugProject` — `packages/taskflow/src/core/log-store.ts:25-38`**
   `slugProject` allows `.` and only strips leading/trailing `-`, so `slugProject("..")` → `".."` and `slugProject(".")` → `"."`. Then `projectDir("..")` = `join(logsRoot(), "..")` = `~/.insight-flow` (the parent of `logs/`). **Failure:** a project registering with `projectId: ".."` makes `appendLog` write `~/.insight-flow/error.json` (outside `logs/`), and `GET /api/logs?project=..` reads one level up. Worse, `clearLogs("..")` would `rmSync(~/.insight-flow, {recursive,force})` — wiping `hub.json`/lock/config (latent: `clearLogs` isn't wired to a route yet, but the traversal is live via `appendLog`). Bounded to one level (`/` is sanitized to `-`, so chaining is impossible), and `projectName` is a local registrant value (`isTrustedLocalRequest`-gated `/api/register`) — but the escape is real.
   **Fix:** neutralize pure-dot slugs, e.g. after slugging `if (/^\.+$/.test(s)) return "unknown";` and strip leading dots — no name can resolve to `.`/`..`. (Optionally realpath-confine `projectDir` to `logsRoot()`.)

## Non-blocking

1. **`POST /log` uses `isTrustedLocalRequest` (header-only), not `isTrustedActionRequest` (peer-IP)** — `master/server.ts` /log route. The other write endpoints (fs/create) use the stronger peer-IP guard; a non-browser LAN client (when `INSIGHT_FLOW_TRUSTED_HOSTS` is set) could forge `Host: 127.0.0.1` with no Origin and spam/forge logs. A cross-origin *browser* is correctly blocked. Impact bounded (log spam). Recommend `isTrustedActionRequest` for parity; consider not exposing the tokenless `"master"` key over HTTP at all (the master already calls `recordLog` in-process).
2. **Slug collisions** — `"My Project"` and `"my-project"` share one folder. Filtering stays consistent (stored `projectName` distinguishes them; the `?project=` filter re-slugs), but `listProjects` shows one merged folder. Acceptable; a hash suffix would make folders 1:1 if it matters.

## Security & edge cases

Security subagent: no secret leak (token not logged — "generated code" logs only `projectId` + registry `id`), no XSS. Minor: "registration received" stores the project's filesystem `path` + `url` into the shared log — mild local-path disclosure, not a secret. `GET /api/logs` is `isTrustedLocalRequest`-gated (a website can't read logs cross-origin).

## Notes

- Verified clean: no `appendLog` race, trim ceiling, merge sort, pagination bounds, status codes.
- Endpoint moved `GET /logs` → `GET /api/logs` in N244 (to free `/logs` for the page) — code + tests consistent.
- Fix Blocker 1 (a 1-line slug guard) and this is ready. Reviewed together with N243 (fix-needed) + N244 (approved).

## Review-fix (Round 1) — 2026-07-16

- **Blocker 1 (slug path traversal)** — FIXED. `slugProject` now strips leading/trailing dots AND dashes (`/^[.-]+|[.-]+$/`), so `".."`/`"."`/`"...."` → `"unknown"` (verified), `"../evil"` → `"evil"`, `"normal-proj"` unchanged. No name can resolve to `.`/`..`.
- **NB-1 (gate parity)** — DONE. `POST /log` now uses `isTrustedActionRequest` (peer-IP guard) like the other write endpoints; loopback + allowlisted-host callers still pass (log-store integration test green).
- **NB-2 (slug collisions)** — not actioned (accepted; stored `projectName` distinguishes them).
- **Gates:** build OK, typecheck clean, eslint 0 errors, 369/369 tests.


---

## Round 2 — re-review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-16
**Verdict:** approved

### Summary

Blocker fixed correctly. `slugProject` now strips leading/trailing `[.-]` — verified against the traversal inputs: `".."`/`"."`/`"...."` → `"unknown"`, `"../evil"` → `"evil"`, real names unchanged. No name can resolve to `.`/`..`, so `projectDir`/`clearLogs` can't escape `logs/`. The NB gate-parity is also done (`POST /log` → `isTrustedActionRequest`; the master client posts over loopback so it still passes, and the log-store integration test is green). No new issues. Approved.

### Blockers

None.

### Non-blocking

- Slug collisions (NB-2) intentionally left (stored `projectName` distinguishes them). GET /api/logs stays `isTrustedLocalRequest` (read; not flagged).

### Notes

Ready to ship. typecheck clean, 369/369.
