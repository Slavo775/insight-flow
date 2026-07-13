# N212 — Reverse-proxy spike: master serves a project dashboard (incl. SSE) on one origin

**Type:** feat
**Priority:** high
**Created:** 2026-07-10

## Problem

The unified PWA (roadmap) requires **one origin**: the master hub on a single port proxying each project dashboard, so a service worker, one notification permission, and persistent sounds are possible. Today each project runs on its own port (`:6006`, `:6007`, …) = a different origin. Before building the app shell (N215) and the PWA (N216/N217) we must **de-risk the proxy**: prove the master can transparently serve a project's React dashboard **and its live SSE stream** through a path prefix on the master origin.

## Goal

1. Master reverse-proxies a running project dashboard under `/p/<projectId>/*` on the master origin.
2. The proxied dashboard **fully works**: HTML, static assets (JS/CSS/sounds), JSON APIs, and — critically — the **SSE** live stream keep working (no buffering, stream stays open).
3. A written conclusion (SPIKE.md): does it hold, what had to change (asset base paths, SSE headers), risks for N215.

## Scope

### In scope

- `packages/taskflow/src/master/server.ts` — a proxy handler: match `/p/<id>/(.*)`, look up the project URL in the registry, stream request/response via Node `http.request` (preserve SSE — no buffering, forward `text/event-stream` as-is).
- The dashboard client **asset base path** so JS/CSS/sound URLs resolve under `/p/<id>/` (the Vite app assumes root `/`). Determine `<base>` tag vs runtime base vs Vite `base` option.
- A scripted verification (curl + note) that SSE frames flow through the proxy.

### Out of scope

- The React app shell / project switcher (N215) — this spike only proves the plumbing.
- Auth, persistence, PWA, notifications, port assignment.
- Rewriting the per-project dashboard beyond the minimal base-path change.

## Implementation plan

1. **Proxy route.** In `master/server.ts`, add `/p/<id>/*` → resolve project entry → pipe to `<projectUrl>/<rest>` (forward method/headers/body; stream response, no buffering).
2. **SSE passthrough.** For `text/event-stream` (the dashboard's `/sse`): forward with `Cache-Control: no-transform`, no compression, `flushHeaders()`, keep-alive; confirm incremental frames.
3. **Asset base path.** Find the minimal change so assets resolve under `/p/<id>/`; document the approach.
4. **Verify.** Start + register a project dashboard, open `http://localhost:<master>/p/<id>/` — app loads, board renders, live update streams. Capture a curl SSE frame through the proxy.
5. **Conclusion** → SPIKE.md: feasible? changes required? risks for N215.

## Verification

- `curl -N http://localhost:<master>/p/<id>/sse` streams `event:`/`data:` frames incrementally (not a buffered dump).
- The dashboard at `/p/<id>/` renders and receives a live task update.
- Build ✅ · tests green · typecheck ✅.

## Notes

- **Roadmap Phase 0.** Gates N215. Decision locked (analysis): single-origin reverse-proxy, not iframe.
- Fallbacks if SSE-through-proxy is fragile: master subscribes to project SSE and re-emits on its own origin; or a WebSocket bridge.
- Related: [[N213]] registry · [[N215]] app shell.
