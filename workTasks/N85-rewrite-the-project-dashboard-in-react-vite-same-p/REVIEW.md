# N85 — Rewrite the project dashboard in React + Vite (same-port, read-only, parity) + markdown rendering of task files — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-09
**PR:** https://github.com/Slavo775/insight-flow/pull/60
**Verdict:** approved

## Summary

Three-phase React + Vite rewrite of the project dashboard, served same-port from `dist/dashboard`, at behavior parity with the retired server-rendered `dashboard.ts` generator (−1,286 lines net at cutover), plus a new read-only markdown viewer. Backend stays a clean read-only contract: the only additions are `GET /api/task-doc` (whitelisted + traversal-guarded) and four read-only flags on the existing `/sse` snapshot. **Low-medium risk** — large surface, but it's behavior-preserving, the legacy `/` only flipped after parity, and the change is well isolated (frontend + build + two read routes). No write surface added; agent-driven lifecycle untouched.

## Checklist verification

- [x] `/` served by the React+Vite SPA on the same port — **pass** (verified live: `id="root"` + hashed `/assets/*`; e2e-smoke asserts it).
- [x] MIME serves `.js/.css/.svg/.woff2`; assets at `/assets/*` — **pass** (`index.ts` MIME map + guarded asset route).
- [x] Parity: stats / Kanban / timeline / detail / shard nav — **pass** (CSS ported verbatim; markup mirrors `dashboard.ts`).
- [x] Live updates via `/sse` + sounds — **pass** (`useDashboardStream`: connection dot, file-change reload, reconnect re-sync; Web-Audio fallback).
- [x] Iframe-safe — **pass** (asset URLs are root-absolute `/assets/…`, origin-relative; resolve identically when embedded).
- [x] Read-only markdown endpoint + viewer — **pass** (whitelist + traversal guard; `react-markdown` + `remark-gfm` + `rehype-sanitize`).
- [x] No UI writes / drag-drop / lifecycle mutation — **pass** (only GET routes added; no write endpoints).
- [x] `/config`, `/overview`, master (6100) untouched — **pass** (verified `/config` still server-rendered; helpers retained).
- [x] One package; `vite build` after `tsup`; `dist/dashboard` ships — **pass** (`npm pack` confirmed `index.html` + `assets/*`).
- [x] Gates: typecheck (CLI + client), lint, format, **87/87 tests** — **pass** (re-run independently).

## Non-blocking

1. **Stale architecture docs (should fix before merge).** `docs/architecture-diagrams.md` still says `GET / → server-rendered dashboard HTML` (line 127), "the project dashboard at / is fully server-rendered HTML + vanilla JS (no React)" (line 135), and references `src/server/dashboard.ts` for the activity feed (line 260). These now assert the *opposite* of reality. TASK.md flagged updating Diagram 2; it wasn't done. **Fix:** update those lines to describe the React+Vite SPA delivery (`/` → SPA shell, `/assets/*`, `/api/task-doc`). — ✅ **Resolved** (`/task-review-fix`): `docs/architecture-diagrams.md` updated — `/` → SPA shell, added `/assets/*` + `/api/task-doc` + `/config`, replaced the stale `socket.io` line with `/sse` frames, and corrected the UI-composition + activity-feed source paths.
2. **Activity timestamps don't auto-tick.** The legacy dashboard refreshed `relativeTime` every 30 s; the React feed recomputes only on re-render (new event/snapshot), so "2m" can freeze between events. Minor. **Fix (optional):** a 30 s interval bumping a state counter.
3. **Empty-state grace removed.** Legacy delayed the "waiting for activity" state ~3 s when `hookStatus === ok`; the React feed shows it immediately. Cosmetic.
4. **Nav project name flashes empty** until the first `/sse` snapshot arrives (it was server-injected before). Sub-second; harmless.
5. **Activity-feed React keys** fall back to array index when an event lacks `id` — fine functionally; minor reconciliation churn on prepend.

## Security & edge cases

- `GET /api/task-doc`: name is whitelisted (`TASK/CHECKLIST/REVIEW/ANALYSIS`) and the resolved path must stay within `workDir` — verified 400 on `name=HACK` and on `folder=../../etc`. **OK.**
- `/assets/*`: path-traversal guard (`startsWith(DASHBOARD_DIR + sep)`). **OK.**
- `dangerouslySetInnerHTML` (activity feed): every dynamic field in `renderActivityItemHtml` is `escHtml`-escaped; static HTML entities only otherwise. Markdown is sanitized via `rehype-sanitize`. No XSS vector found. **OK.**
- No new write endpoints — read-only/agent-driven invariant preserved.

## Notes

- Decided + sequenced via `/task-analyze`; React (over Preact/modularize) and parallel-until-parity were explicit owner choices. Out-of-scope items (UI writes, custom workflows, agent-modules, master/`/config` rewrite) were correctly left untouched.
- Client is excluded from the CLI `tsc` and type-checked via its own tsconfig (`typecheck` runs both) — sound separation; no `any`/`@ts-ignore`/`console.*` in the client.
- Follow-up: finding #1 (docs) resolved in this PR via `/task-review-fix`. Findings #2–#5 remain as optional cosmetic polish (not actioned — non-blocking, not authorized).
